const path = Npm.require('path');
const LRU = Npm.require('lru-cache');

const CACHE_SIZE = process.env.METEOR_TEMPLATING_CACHE_SIZE || 1024*1024*10;
const CACHE_DEBUG = !! process.env.METEOR_TEST_PRINT_TEMPLATING_CACHE_DEBUG;

// Export from the file
CachingHTMLCompiler = class CachingHTMLCompiler {
  constructor ({compileTemplates = true}) {
    this.compileTemplates = compileTemplates;

    // Maps from a source hash to the return value of HtmlScanner.scan (a {js,
    // head, body} object.
    this._cache = new LRU({
      max: CACHE_SIZE,
      // Cache is measured in bytes.
      length: (value) => {
        return lengthOrZero(value.head) + lengthOrZero(value.body) +
          lengthOrZero(value.js);
      }
    });
  }

  processFilesForTarget(files) {
    const bodyAttrs = {};
    const bodyAttrsOrigin = {};

    files.forEach((file) => {
      const scanned = this._doHTMLScanning(file);

      // failed to parse?
      if (! scanned)
        return;

      Object.keys(scanned.bodyAttrs).forEach((attr) => {
        const val = scanned.bodyAttrs[attr];
        if (bodyAttrs.hasOwnProperty(attr) && bodyAttrs[attr] !== val) {
          // two conflicting attributes on <body> tags in two different template
          // files
          const conflictingFilesStr = [bodyAttrsOrigin[attr], file].map((f) => {
            return f.getPathInPackage();
          }).join(', ');

          file.error({
            message: `<body> declarations have conflicting values for the '${attr}' attribute in the following files: ${conflictingFilesStr}.`
          });

          return;
        }

        bodyAttrs[attr] = val;
        bodyAttrsOrigin[attr] = file;
      });
    });
  }

  _doHTMLScanning(inputFile) {
    const cacheKey = inputFile.getSourceHash();
    let results = this._cache.get(cacheKey);

    if (! results) {
      const contents = inputFile.getContentsAsString();
      try {
        // Note: the path is only used for errors, so it doesn't have to be part
        // of the cache key.
        results = HtmlScanner.scan(contents, inputFile.getPathInPackage());
      } catch (e) {
        if ((e instanceof HtmlScanner.ParseError) ||
            (e instanceof HtmlScanner.BodyAttrsError)) {
          inputFile.error({
            message: e.message,
            line: e.line
          });
          return null;
        } else {
          throw e;
        }
      }
      this._cache.set(cacheKey, results);
    }

    if (results.head)
      inputFile.addHtml({ section: "head", data: results.head });

    if (results.body)
      inputFile.addHtml({ section: "body", data: results.body });

    if (results.js) {
      const filePath = inputFile.getPathInPackage();
      let pathPart = path.dirname(filePath);
      if (pathPart === '.')
        pathPart = '';
      if (pathPart.length && pathPart !== path.sep)
        pathPart = pathPart + path.sep;
      const ext = path.extname(filePath);
      const basename = path.basename(filePath, ext);

      // XXX generate a source map

      inputFile.addJavaScript({
        path: path.join(pathPart, `template.${basename}.js`),
        data: results.js
      });
    }

    return {
      bodyAttrs: results.bodyAttrs
    };
  }
};

/**
 * Helper function used in the cache
 * @param  {Object} [field] An object with a length property
 * @return {Number} If `field` not passed, 0; otherwise the `length` property
 * of `field`.
 */
function lengthOrZero (field) {
  return field ? field.length : 0;
}
