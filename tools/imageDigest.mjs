import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { isFileOrDirExist, defaultCoverSize } from './common.mjs';

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
 * @param {string | Buffer} input: image path or Buffer
 */
export function resizeImage(input) {}

/**
 * @param {string | Buffer} input: image path or Buffer
 * @param {object} output: {outputDir, outputName}
 */
export async function resizeImageByDefault(input, output) {
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

export async function outsideImageByDefault(input, output) {
  const { width, height } = defaultCoverSize;
  const format = await getImageIntrinsicFormat(input);
  const { outputDir, outputName } = ensureOutput(input, output);
  const image = sharp(await extractBuffer(input), { animated: format === 'gif' }).resize({
    width,
    height,
    fit: 'outside',
  });
  const to = `${outputDir}/${outputName}.${format}`;
  await image.toFile(to);
  return to;
}

/**
 * @param {string | Buffer} input: image path or Buffer
 */
export function cropImage(input) {}

/**
 * @param {string | Buffer} input: image path or Buffer
 */
export async function cropImageByDefault(input) {
  sharp(await extractBuffer(input))
    .extract({ left: left, top: top, width: width, height: height })
    .toFile(output, function (err) {
      // Extract a region of the input image, saving in the same format.
    });
}

export async function fitImageByDefault(input, output) {
  // resize or crop?
  return await resizeImageByDefault(input, output);
}
