// Common
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import { is } from 'unist-util-is';
import dayjs from 'dayjs';

export async function isFileOrDirExist(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}

export function getDirName(importMetaUrl) {
  let file = importMetaUrl;
  if (importMetaUrl.includes('://')) {
    const url = new URL(importMetaUrl);
    file = url.protocol === 'file:' ? fileURLToPath(importMetaUrl) : url.href;
  }
  return path.dirname(file);
}

function resolve(seg) {
  return path.join(getDirName(import.meta.url), seg);
}

export async function readBlogManifest() {
  return JSON.parse(await fs.readFile(blogManifestPath, { encoding: 'utf-8' }));
}

export function createBlogPermalinkPath(id) {
  return `${blogRelativePermalLink}/${id}/`;
}

export async function prettierFormat(toPath, content, parser) {
  const prettierOpts = await prettier.resolveConfig(prettierConfigPath);
  await fs.writeFile(
    toPath,
    prettier.format(content, Object.assign({}, prettierOpts, parser ? { parser } : {}))
  );
}

export async function syncBlogList2Readme() {
  function insertBlogList(lang = 'en') {
    // Whenever you change README*.md blog list title，remember sync here.
    const lang2Title = {
      en: 'Blog list',
      zh_CN: '文章列表',
    };
    function isHead(node) {
      return is(node, 'text') && node.value === lang2Title[lang];
    }
    function createListItem({ title, url }) {
      const node = Object.create(null);
      Object.assign(node, {
        type: 'listItem',
        ordered: false,
        spread: false,
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'link',
                title: null,
                spread: false,
                url,
                children: [
                  {
                    type: 'text',
                    value: title,
                  },
                ],
              },
            ],
          },
        ],
      });
      return node;
    }

    function createListNode(list) {
      const root = Object.create(null);
      Object.assign(root, {
        type: 'list',
        ordered: false,
        children: list.map((item) => createListItem(item)),
      });
      return root;
    }

    return async (tree) => {
      let headIndex = -1;
      visit(tree, 'heading', (node, index) => {
        if (node.children && isHead(node.children[0])) {
          headIndex = index;
        }
      });
      if (headIndex > -1) {
        const nextIndex = headIndex + 1;
        const nextNode = tree.children[nextIndex];
        const manifest = await readBlogManifest();
        const list = Object.entries(manifest)
          .sort((a, b) => {
            const [aTitle, aData] = a;
            const [bTitle, bData] = b;
            const { date: aDate } = aData;
            const { date: bDate } = bData;
            if (aDate && bDate) {
              return dayjs(bDate) - dayjs(aDate);
            }
            return bTitle.localeCompare(aTitle);
          })
          .map((entry) => ({
            title: entry[0],
            url: encodeURI(`https://avennn.github.io${createBlogPermalinkPath(entry[1].id)}`),
          }));

        if (is(nextNode, 'list')) {
          tree.children.splice(nextIndex, 1, createListNode(list));
        } else {
          tree.children.splice(nextIndex, 0, createListNode(list));
        }
      }
    };
  }

  const list = [
    ['en', readmePath],
    ['zh_CN', readmeCNPath],
  ];

  for (const [lang, mdPath] of list) {
    const md = await remark()
      .use(insertBlogList, lang)
      .process(await fs.readFile(mdPath));

    await prettierFormat(mdPath, md.toString(), 'markdown');
  }
}

export const blogManifestPath = resolve('../_data/blogs.json');
export const blogRelativePermalLink = '/posts';
export const blogOutputDir = resolve('../_posts');
export const blogImgRelativeUrl = '/assets/img/blogs';
export const blogTempImgRelativeUrl = '/assets/img/blogs-temp';
export const blogImgOutputDir = resolve(`../${blogImgRelativeUrl}`);
export const blogTempImgOutputDir = resolve(`../${blogTempImgRelativeUrl}`);
export const prettierConfigPath = resolve('../.prettierrc');
export const readmePath = resolve('../README.md');
export const readmeCNPath = resolve('../README.zh_CN.md');
