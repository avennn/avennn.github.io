import fs from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import { blogManifestPath, blogRelativePermalLink, blogOutputDir } from './config.mjs';

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
  const manifest = JSON.parse(await fs.readFile(blogManifestPath, { encoding: 'utf8' }));
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

const [, , type] = process.argv;
switch (type) {
  case 'permalink':
    batchAddPermalink();
    break;
  default:
    console.error('Usage: "yarn fixdata [permalink]"');
    process.exit(1);
}
