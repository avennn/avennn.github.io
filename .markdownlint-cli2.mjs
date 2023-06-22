// fields: categories + tags
const restrictBlogFields = {
  names: ['restrict-blog-fields'],
  description: 'Blog fields',
  tags: ['test'],
  function: (params, onError) => {
    const { frontMatterLines, config = {} } = params;
    const { categories: allowedCategories = [], tags: allowedTags = [] } = config;
    if (frontMatterLines) {
      const categoryLine = frontMatterLines.find((item) => /categories:\s*\[.*\]/.test(item));
      const tagLine = frontMatterLines.find((item) => /tags:\s*\[.*\]/.test(item));

      if (!categoryLine) {
        onError({
          lineNumber: 1,
          detail: 'Should have "categories" field',
        });
      }
      if (!tagLine) {
        onError({
          lineNumber: 1,
          detail: 'Should have "tags" field',
        });
      }

      const matchedCategories = categoryLine.match(/categories:\s*\[(.*)\]/);
      const matchedTags = tagLine.match(/tags:\s*\[(.*)\]/);

      if (matchedCategories) {
        const categories = matchedCategories[1]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (
          !categories.length ||
          categories.length > 1 ||
          !allowedCategories.includes(categories[0])
        ) {
          onError({
            lineNumber: 1,
            detail: `Categories should be one of [${allowedCategories.join(', ')}]`,
          });
        }
      }
      if (matchedTags) {
        const tags = matchedTags[1]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (!tags.length || tags.some((tag) => !allowedTags.includes(tag))) {
          onError({
            lineNumber: 1,
            detail: `Tags should be one or more of [${allowedTags.join(', ')}]`,
          });
        }
      }
    }
  },
};

let no = 1;
const allBuiltInRules = {};
while (no < 54) {
  // disable all built-in rules
  allBuiltInRules[no > 9 ? `MD0${no}` : `MD00${no}`] = false;
  no++;
}

export default {
  config: {
    default: true,
    ...allBuiltInRules,
    'restrict-blog-fields': {
      // Define categories and tags here.
      categories: ['前端', '后端', 'Linux', '架构', 'AI', '理财', '职场', '生活随笔'],
      tags: [
        'js',
        'css',
        'html',
        'ts',
        'nodejs',
        'react',
        'vue',
        'vscode',
        '微前端',
        '浏览器',
        'chrome',
        'v8',
        'web安全',
        'shell',
        '工具',
        '硬链接',
        '软链接',
        'eslint',
        'service worker',
        'cli',
        '事件循环',
      ],
    },
  },
  customRules: [restrictBlogFields],
  globs: ['_posts/**/*.md'],
};
