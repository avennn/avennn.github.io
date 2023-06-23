import path from 'node:path';
import { blogOutputDir } from './tools/config.mjs';

console.log(
  `---
title: N个前端开发实用网站
date: 2021-11-10 16:11:00 +0800
categories: [前端]
tags: [工具]
image:
  path: /assets/img/blogs/cc3b73a8-98c2-4459-8318-582fe41c1225.jpeg
---`.match(/(?<=tags.*?\n).*?(?=image)/),
  /(?<=tags.*?\n).*?(?=image)/.test(`---
title: N个前端开发实用网站
date: 2021-11-10 16:11:00 +0800
categories: [前端]
tags: [工具]
image:
  path: /assets/img/blogs/cc3b73a8-98c2-4459-8318-582fe41c1225.jpeg
---`)
);
