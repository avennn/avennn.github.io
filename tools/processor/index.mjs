import fs from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { remark } from 'remark';
import { v4 as uuidv4 } from 'uuid';
import { visit } from 'unist-util-visit';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import fetch from 'node-fetch';
import remarkFrontmatter from 'remark-frontmatter';

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
      path.join(getDirName(import.meta.url), `../../${localUrl}`),
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
  return (tree) => {
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
        `title: ${fileName}\n` +
        `date: ${now}\n` +
        `last_modified_at: ${now}\n` +
        `categories: [前端]\n` +
        `tags: [js]`;
      tree.children.unshift(frontMatter);
    }
  };
}

const images = [];
const md = '/Users/liangjianwen/Desktop/workspace/blog/浅谈MessageChannel.md';
const fileNameWithSuffix = path.basename(md);
const fileName = fileNameWithSuffix.substring(0, fileNameWithSuffix.indexOf('.'));
const destName = `${dayjs().format('YYYY-MM-DD')}-${fileName}.md`;
const destPath = path.join(getDirName(import.meta.url), `../../_posts/${destName}`);
const file = await remark()
  .use(remarkFrontmatter)
  .use(replaceWithLocalImages)
  .use(insertFrontMatter)
  .process(await fs.readFile(md));

await fs.writeFile(destPath, file.toString());
// 修改博客manifest
const manifestPath = path.join(getDirName(import.meta.url), '../../_data/blogs.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, { encoding: 'utf8' }));
console.log(manifest, typeof manifest);
Object.assign(manifest, {
  [fileName]: {
    id: uuidv4(),
    postName: destName,
    images,
  },
});
fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
