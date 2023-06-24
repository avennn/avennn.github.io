// for md file
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import os from 'node:os';
import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import { is } from 'unist-util-is';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import fetch from 'node-fetch';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import chalk from 'chalk';
import { rimraf } from 'rimraf';
import {
  blogManifestPath,
  blogOutputDir,
  blogImgOutputDir,
  blogTempImgOutputDir,
  blogImgRelativeUrl,
  readBlogManifest,
  createBlogPermalinkPath,
  prettierFormat,
  syncBlogList2Readme,
} from './common.mjs';
import { compressImage } from './imageDigest.mjs';

dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.tz.setDefault('Asia/Shanghai');

function replaceWithLocalImages(imageStore) {
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
    const tempUrl = path.join(blogTempImgOutputDir, imageName);
    await fs.writeFile(tempUrl, Buffer.from(arrayBuffer));
    return { imageId: id, imageName, localUrl: `${blogImgRelativeUrl}/${imageName}`, tempUrl };
  }

  return async (tree) => {
    const imageNodes = [];

    visit(tree, 'image', (node) => {
      if (isYuQueUrl(node.url)) {
        imageNodes.push(node);
      }
    });

    const expectedUrls = imageNodes.map((item) => item.url);
    const downloadedUrls = [];

    for await (const node of imageNodes) {
      // Download image to temp dir
      const { imageId, imageName, localUrl, tempUrl } = await downloadImage(node.url);
      downloadedUrls.push(node.url);
      // Compress image and copy to real output dir
      await compressImage(tempUrl, { outputDir: blogImgOutputDir, outputName: imageId });
      imageStore.push(imageName);
      node.url = localUrl;
    }

    // console error info
    const failedUrls = expectedUrls.filter((url) => !downloadedUrls.includes(url));
    console.log(
      `Images expected: ${expectedUrls.length}, actual: ${downloadedUrls.length}, failed: ${failedUrls.length}`
    );
    if (failedUrls.length) {
      console.log(chalk.red(`\nFailed lsit:\n${failedUrls.join('\n')}`));
    }
  };
}

function insertFrontMatter({ id, date }) {
  function removeCoverImage(tree) {
    // 递归找第一个元素，如果是image类型，则为封面图
    let parent;
    let node = tree;
    while (node.children && node.children.length) {
      parent = node;
      node = node.children[0];
    }
    if (is(node, 'image')) {
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
      frontMatter.type = 'yaml';
      frontMatter.value =
        `title: ${fileName}` +
        `\ndate: ${date}` +
        `\ncategories: [前端]` +
        `\ntags: [js]` +
        `\npermalink: ${createBlogPermalinkPath(id)}`;
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

console.log(chalk.cyan('Digesting blog...'));

// clear temporary blog image output dir
await rimraf(blogTempImgOutputDir);

const fileNameWithSuffix = path.basename(blogPath);
const fileName = fileNameWithSuffix.substring(0, fileNameWithSuffix.indexOf('.'));
const destName = `${dayjs().format('YYYY-MM-DD')}-${fileName}.md`;
const destPath = path.join(blogOutputDir, destName);

const blogId = uuidv4();
const images = [];
const now = dayjs().format('YYYY-MM-DD HH:mm:ss ZZ');

// 下载图片 + 输出md到_posts
const file = await remark()
  .use(remarkFrontmatter)
  .use(replaceWithLocalImages, images)
  .use(insertFrontMatter, { id: blogId, date: now })
  .process(await fs.readFile(blogPath));

await fs.writeFile(destPath, file.toString());

// 修改blogs.json
const manifest = await readBlogManifest();
Object.assign(manifest, {
  [fileName]: {
    id: blogId,
    postName: destName,
    date: now,
    images,
  },
});
await prettierFormat(blogManifestPath, JSON.stringify(manifest), 'json');

// 自动修改README.md
await syncBlogList2Readme();

console.log(chalk.green('Success!'));
