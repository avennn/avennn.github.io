# 杂物

## logo 生成

https://realfavicongenerator.net/

## TODO

- [ ] 字体样式加载后页面抖动问题
- [ ] 文章授权协议
- [ ] google 分析, Google Analytics 4
- [ ] 自定义 jekyll plugin，liquid tag，忽略 code block 和 inline code 的 curly bracket.
- [ ] Readme插入博客列表，remark和prettier样式同步（remark看是否可以配置或者有插件，或者prettier是否可以修改默认格式效果），以此可以去掉prettier format的调用，提升性能。
- [ ] chirpy {: width="400" }放在图片后面导致`<img>`和文本没有换行符隔开，所以图片和文本重叠。解决办法之一：popup设置display: table（研究下为什么这么神奇？）。研究是否可以从语法解析上解决。
- [ ] 有时候修改scss，serve不生效，缓存更新失效？

## 图片压缩

开源 npm 包

- [sharp](https://github.com/lovell/sharp)
- [imagemin](https://github.com/imagemin/imagemin)
- [compress-images](https://github.com/Yuriy-Svetlov/compress-images/)

平台

- [tinypng](https://tinypng.com/)

https://stackoverflow.com/questions/39894913/how-do-i-get-the-best-png-compression-with-gulp-imagemin-plugins
