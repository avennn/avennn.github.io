import fs from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import {
  blogManifestPath,
  blogRelativePermalLink,
  blogOutputDir,
  readBlogManifest,
  prettierFormat,
  syncBlogList2Readme,
} from './common.mjs';

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
  const data = Object.entries(manifest).find((item) => item[1].postName === name);
  if (data) {
    const id = data[0];
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
    const dataItem = Object.keys(manifest).find((item) => item === id);
    dataItem.date = date;
    await prettierFormat(blogManifestPath, JSON.stringify(manifest), 'json');
  };
}

async function addDate(blogPath) {
  const name = path.basename(blogPath);
  const manifest = await readBlogManifest();
  const data = Object.entries(manifest).find((item) => item[1].postName === name);
  if (data) {
    const id = data[0];
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
