import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { isFileOrDirExist, defaultCoverSize, goldAspectRatio } from './common.mjs';

/**
 * @param {string | Buffer} input: image path or Buffer
 */
async function extractBuffer(input) {
  return Buffer.isBuffer(input) ? input : await fs.readFile(input);
}

/**
 * @param {string | Buffer} input: image path or Buffer
 */
async function getImageIntrinsicFormat(input) {
  const image = sharp(await extractBuffer(input));
  const { format } = await image.metadata();
  return format;
}

/**
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName} outputName without ext, optional when input is image path} output
 */
function ensureOutput(input, output = {}) {
  let { outputDir, outputName } = output;

  if (Buffer.isBuffer(input)) {
    assert.ok(
      outputDir && outputName,
      'Image buffer input should have second param contains "outputDir" and "outputName"'
    );
  }

  if (!outputDir) {
    outputDir = path.dirname(input);
  }

  if (!outputName) {
    const basename = path.basename(input);
    const dotIndex = basename.lastIndexOf('.');
    outputName = basename.substring(0, dotIndex > -1 ? dotIndex : Infinity);
  }

  return { outputDir, outputName };
}

/**
 * Compress image by sharp
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName}
 * @param {boolean} forceAnimated: if you know an image is animated, such as an animted webp, you can tell.
 */
export async function compressImage(input, output, forceAnimated) {
  const format = await getImageIntrinsicFormat(input);
  const { outputDir, outputName } = ensureOutput(input, output);
  let image = sharp(await extractBuffer(input), {
    // TODO: how to justify animated webp?
    animated: forceAnimated || format === 'gif',
  });

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

/**
 * @param {string | Buffer} input: image path or Buffer
 */
export async function getImageMetaData(input) {
  return await sharp(await extractBuffer(input)).metadata();
}

/**
 * auto
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName}
 */
export async function resizeCover(input, output) {
  const { width, height } = defaultCoverSize;
  const format = await getImageIntrinsicFormat(input);
  const { outputDir, outputName } = ensureOutput(input, output);
  const image = sharp(await extractBuffer(input), { animated: format === 'gif' }).resize({
    width,
    height,
    fit: 'cover',
  });
  const to = `${outputDir}/${outputName}.${format}`;
  await image.toFile(to);
  return to;
}

/**
 * manual util
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName}
 */
export async function resizeImage(input, output, options) {
  const format = await getImageIntrinsicFormat(input);
  const { outputDir, outputName } = ensureOutput(input, output);
  const image = sharp(await extractBuffer(input), { animated: format === 'gif' }).resize(options);
  const to = `${outputDir}/${outputName}.${format}`;
  await image.toFile(to);
  return to;
}

/**
 * auto
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName}
 */
export async function cropCover(input, output) {
  const { format, width, height } = await getImageMetaData(input);
  const { outputDir, outputName } = ensureOutput(input, output);
  let w = width,
    h = height,
    left = 0,
    top = 0;
  if (width / height >= goldAspectRatio) {
    w = Math.floor(height * goldAspectRatio);
    left = Math.floor((width - w) / 2);
  } else {
    h = Math.floor(width / goldAspectRatio);
    top = Math.floor((height - h) / 2);
  }
  const image = sharp(await extractBuffer(input), { animated: format === 'gif' }).extract({
    left,
    top,
    width: w,
    height: h,
  });
  const to = `${outputDir}/${outputName}.${format}`;
  await image.toFile(to);
  return to;
}

/**
 * manual util
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName}
 */
export async function cropImage(input, output, options) {
  const format = await getImageIntrinsicFormat(input);
  const { outputDir, outputName } = ensureOutput(input, output);
  const image = sharp(await extractBuffer(input), { animated: format === 'gif' }).extract(options);
  const to = `${outputDir}/${outputName}.${format}`;
  await image.toFile(to);
  return to;
}

export async function fitCover(input, output) {
  return await resizeCover(input, output);
}
