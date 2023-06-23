// Common
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';

function getDirName(p) {
  let file = p;
  if (p.includes('://')) {
    const url = new URL(p);
    file = url.protocol === 'file:' ? fileURLToPath(p) : url.href;
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

export const blogManifestPath = resolve('../_data/blogs.json');
export const blogRelativePermalLink = '/posts';
export const blogOutputDir = resolve('../_posts');
export const blogImgRelativeUrl = '/assets/img/blogs';
export const blogImgOutputDir = resolve(`../${blogImgRelativeUrl}`);
export const prettierConfigPath = resolve('../.prettierrc');
export const readmePath = resolve('../README.md');
export const readmeCNPath = resolve('../README.zh_CN.md');
