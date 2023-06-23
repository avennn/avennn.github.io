# 杂物

## logo 生成

https://realfavicongenerator.net/

## TODO

- [ ] 新增文章自动添加到README.md，jekyll生成site url是如何转换文章标题？
- [ ] 安全问题：jekyll ignore files生成
- [ ] blogs.json，md，图片临时目录，原子化处理
- [ ] 图片压缩，尤其是头图，tinypng?
- [ ] 头图尺寸裁剪成合理的比例
- [ ] 字体样式加载后页面抖动问题
- [ ] 文章授权协议
- [ ] google 分析, Google Analytics 4
- [ ] 自定义 jekyll plugin，liquid tag，忽略 code block 和 inline code 的 curly bracket.

## site转换

https://github.com/jekyll/jekyll/blob/master/rake/site.rake
https://github.com/jekyll/jekyll/blob/master/lib/jekyll/commands/build.rb
https://github.com/jekyll/jekyll/blob/master/lib/jekyll/site.rb
https://github.com/jekyll/jekyll/blob/58a1f62b2349bb477fc9999c40331cecdca577d8/lib/jekyll/document.rb

site.rake ->
Build process ->
site.rb Jekyll.sanitized_path ->
document.rb destination方法/cleaned_relative_path方法 ->
url.rb self.escape_path

## 图片压缩

开源 npm 包

- [sharp](https://github.com/lovell/sharp)
- [gm](https://github.com/aheckmann/gm)
- [imagemin](https://github.com/imagemin/imagemin)
- [compress-images](https://github.com/Yuriy-Svetlov/compress-images/)

平台

- [tinypng](https://tinypng.com/)
- [karen.io](https://kraken.io/)
- compressor.io
