// for image
import fs from 'node:fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getDirName, isFileOrDirExist } from './common.mjs';

/**
 * @param {string | Buffer} input: image path or Buffer
 */
async function getImageIntrinsicFormat(input) {
  const image = sharp(Buffer.isBuffer(input) ? input : await fs.readFile(input));
  const { format } = await image.metadata();
  return format;
}

/**
 * 图片压缩
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName} outputName without ext, optional when input is image path
 * @param {boolean} forceAnimated: if you know an image is animated, such as an animted webp, you can tell.
 */
export async function compressImage(input, output = {}, forceAnimated) {
  const format = await getImageIntrinsicFormat(input);
  const option = {
    animated: forceAnimated || format === 'gif',
  };
  let { outputDir, outputName } = output;
  let image;

  if (Buffer.isBuffer(input)) {
    image = sharp(input, option);
  } else {
    if (!outputDir) {
      outputDir = path.dirname(input);
    }
    if (!outputName) {
      const basename = path.basename(input);
      const dotIndex = basename.lastIndexOf('.');
      outputName = basename.substring(0, dotIndex > -1 ? dotIndex : Infinity);
    }
    image = sharp(await fs.readFile(input), option);
  }

  switch (format) {
    case 'jpeg':
      image = image.jpeg({ mozjpeg: true });
      break;
    case 'png':
      image = image.png({ quality: 80, compressionLevel: 9 });
      break;
    case 'gif':
      image = image.gif();
      break;
    case 'webp':
      image = image.webp();
      break;
    default:
      break;
  }

  if (!(await isFileOrDirExist(outputDir))) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  const to = `${outputDir}/${outputName}.${format}`;
  await image.toFile(to);

  return to;
}

const dir = path.join(getDirName(import.meta.url), '../assets/img/blogs');

function resolve(name) {
  return path.join(dir, name);
}

// compressImage(
//   '/Users/liangjianwen/Desktop/workspace/projects/avennn.github.io/assets/img/blogs/1b4d4ddb-7620-477e-b1f9-8f3ce24574e4.jpeg',
//   { outputName: '1', outputDir: dir }
// );
