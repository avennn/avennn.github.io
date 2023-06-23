// Common config
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

export const blogManifestPath = path.join(getDirName(import.meta.url), '../_data/blogs.json');
export const blogRelativePermalLink = '/posts';
export const blogOutputDir = path.join(getDirName(import.meta.url), '../_posts');
export const blogImgRelativeUrl = '/assets/img/blogs';
export const blogImgOutputDir = path.join(getDirName(import.meta.url), `../${blogImgRelativeUrl}`);
export const prettierConfigPath = path.join(getDirName(import.meta.url), '../.prettierrc');
