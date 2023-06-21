import { promisify } from 'node:util';
import { exec as execLegacy } from 'node:child_process';

const exec = promisify(execLegacy);

try {
  // generate hightlight css with Pygments, https://pygments.org/
  // pygmentize -S <default> -f html -a .highlight > ./default.css
  // replace <default> with any style theme you like.
  // You can see all the style themes from here: https://pygments.org/styles/
  await exec('pygmentize -S one-dark -f html -a .highlight > style.css');
} catch (e) {
  console.error(e);
  process.exit(1);
}
