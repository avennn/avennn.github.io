import fs from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import { is } from 'unist-util-is';
import dayjs from 'dayjs';
import {
  blogManifestPath,
  blogRelativePermalLink,
  blogOutputDir,
  readmePath,
  readmeCNPath,
  readBlogManifest,
  createBlogPermalinkPath,
  prettierFormat,
} from './common.mjs';

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

export async function syncBlogList2Readme() {
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

function insertPermalink(id) {
  return (tree) => {
    visit(tree, 'yaml', (node) => {
      const permalink = `${blogRelativePermalLink}/${id}/`;
      if (node.value.indexOf('permalink') > -1) {
        node.value = node.value.replace(/(?<=permalink).*?(?=\n)/, `: ${permalink}`);
      } else {
        node.value = node.value.replace(/(?<=tags.*?\n).*?(?=.)/, `permalink: ${permalink}\n`);
      }
    });
  };
}

// permalink: /posts/444190b2-f3aa-44d4-b799-f3cff5632d50/
async function addPermalink(blogPath) {
  const name = path.basename(blogPath);
  const manifest = await readBlogManifest();
  const data = Object.values(manifest).find((item) => item.postName === name);
  if (data) {
    const { id } = data;
    const file = await remark()
      .use(remarkFrontmatter)
      .use(insertPermalink, id)
      .process(await fs.readFile(blogPath));

    await fs.writeFile(blogPath, file.toString());
  }
}

async function batchAddPermalink() {
  const list = await fs.readdir(blogOutputDir);
  for (const item of list) {
    await addPermalink(path.join(blogOutputDir, item));
  }
}

function extractBlogDate(id) {
  let date;
  return async (tree) => {
    visit(tree, 'yaml', (node) => {
      const matched = node.value.match(/date:\s*(.+)\n/);
      if (matched) {
        date = matched[1];
      }
    });
    const manifest = await readBlogManifest();
    const dataItem = Object.values(manifest).find((item) => item.id === id);
    dataItem.date = date;
    await prettierFormat(blogManifestPath, JSON.stringify(manifest), 'json');
  };
}

async function addDate(blogPath) {
  const name = path.basename(blogPath);
  const manifest = await readBlogManifest();
  const data = Object.values(manifest).find((item) => item.postName === name);
  if (data) {
    const { id } = data;
    await remark()
      .use(remarkFrontmatter)
      .use(extractBlogDate, id)
      .process(await fs.readFile(blogPath));
  }
}

async function batchAddDate() {
  const list = await fs.readdir(blogOutputDir);
  for (const item of list) {
    await addDate(path.join(blogOutputDir, item));
  }
}

const [, , type] = process.argv;
switch (type) {
  case 'readme':
    syncBlogList2Readme();
    break;
  // Methods below only need to run once.
  case 'permalink':
    batchAddPermalink();
    break;
  case 'date':
    batchAddDate();
    break;
  default:
    console.error('Usage: "yarn syncdata [readme, permalink]"');
    process.exit(1);
}
