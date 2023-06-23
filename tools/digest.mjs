import fs from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import os from 'node:os';
import { remark } from 'remark';
import { v4 as uuidv4 } from 'uuid';
import { visit } from 'unist-util-visit';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import fetch from 'node-fetch';
import remarkFrontmatter from 'remark-frontmatter';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import prettier from 'prettier';

dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.tz.setDefault('Asia/Shanghai');

function getDirName(p) {
  let file = p;
  if (p.includes('://')) {
    const url = new URL(p);
    file = url.protocol === 'file:' ? fileURLToPath(p) : url.href;
  }
  return path.dirname(file);
}

function replaceWithLocalImages() {
  function isYuQueUrl(url) {
    return url && url.startsWith('https://cdn.nlark.com/yuque');
  }

  async function downloadImage(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const id = uuidv4();
    const { pathname } = new URL(url);
    const ext = pathname.substring(pathname.lastIndexOf('.') + 1);
    const imageName = `${id}.${ext}`;
    const localUrl = `/assets/img/blogs/${imageName}`;
    await fs.writeFile(
      path.join(getDirName(import.meta.url), `../${localUrl}`),
      Buffer.from(arrayBuffer)
    );
    return { imageName, localUrl };
  }

  return async (tree) => {
    const imageNodes = [];
    visit(tree, 'image', (node) => {
      if (isYuQueUrl(node.url)) {
        imageNodes.push(node);
      }
    });
    for await (const node of imageNodes) {
      const { imageName, localUrl } = await downloadImage(node.url);
      images.push(imageName);
      node.url = localUrl;
    }
  };
}

function insertFrontMatter() {
  function removeCoverImage(tree) {
    // 递归找第一个元素，如果是image类型，则为封面图
    let parent;
    let node = tree;
    while (node.children && node.children.length) {
      parent = node;
      node = node.children[0];
    }
    if (node.type === 'image') {
      const url = node.url;
      parent.children.shift();
      return url;
    }
  }

  const space = ' ';
  const level2Space = ['', space.repeat(2), space.repeat(4)];
  return (tree) => {
    const coverUrl = removeCoverImage(tree);

    let hasFrontMatter = false;
    visit(tree, 'yaml', (node) => {
      if (node) {
        hasFrontMatter = true;
      }
    });
    if (!hasFrontMatter) {
      const frontMatter = Object.create(null);
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss ZZ');
      frontMatter.type = 'yaml';
      frontMatter.value =
        `title: ${fileName}` +
        `\ndate: ${now}` +
        `\ncategories: [前端]` +
        `\ntags: [js]` +
        `\npermalink: /posts/${blogId}`;
      if (coverUrl) {
        frontMatter.value += `\nimage:\n${level2Space[1]}path: ${coverUrl}`;
      }
      tree.children.unshift(frontMatter);
    }
  };
}

// 整理入参，判断是否传入博客md文件
const [, , ...blogSegments] = process.argv;
let blogPath;
if (!blogSegments.length) {
  // Inquirer.js prompt file select
  inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);

  const { md } = await inquirer.prompt({
    type: 'file-tree-selection',
    name: 'md',
    message: 'Select a markdown file',
    root: os.homedir(),
    validate: (item) => {
      const name = item.split(path.sep).pop();
      return !name.startsWith('.') && name.endsWith('.md');
    },
  });
  blogPath = md;
} else {
  blogPath = blogSegments.join(' ');
}
if (!blogPath || !blogPath.endsWith('.md')) {
  console.error('You must select a markdown file.');
  process.exit(1);
}

console.log('Digesting blog...');
const blogId = uuidv4();
const images = [];
const fileNameWithSuffix = path.basename(blogPath);
const fileName = fileNameWithSuffix.substring(0, fileNameWithSuffix.indexOf('.'));
const destName = `${dayjs().format('YYYY-MM-DD')}-${fileName}.md`;
const destPath = path.join(getDirName(import.meta.url), `../_posts/${destName}`);

// 下载图片 + 输出md到_posts
const file = await remark()
  .use(remarkFrontmatter)
  .use(replaceWithLocalImages)
  .use(insertFrontMatter)
  .process(await fs.readFile(blogPath));

await fs.writeFile(destPath, file.toString());

// 修改blogs.json
const manifestPath = path.join(getDirName(import.meta.url), '../_data/blogs.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, { encoding: 'utf8' }));
Object.assign(manifest, {
  [fileName]: {
    id: blogId,
    postName: destName,
    images,
  },
});
const prettierOpts = await prettier.resolveConfig(
  path.join(getDirName(import.meta.url), '../.prettierrc')
);
fs.writeFile(
  manifestPath,
  prettier.format(JSON.stringify(manifest), { ...prettierOpts, parser: 'json' })
);
