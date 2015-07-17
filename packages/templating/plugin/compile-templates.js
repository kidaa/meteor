var path = Npm.require('path');
var LRU = Npm.require('lru-cache');

var CACHE_SIZE = process.env.METEOR_TEMPLATING_CACHE_SIZE || 1024*1024*10;
var CACHE_DEBUG = !! process.env.METEOR_TEST_PRINT_TEMPLATING_CACHE_DEBUG;

class TemplateCompiler {
  constructor () {
    // Maps from a source hash to the return value of htmlScanner.scan (a {js,
    // head, body} object.
    this._cache = new LRU({
      max: CACHE_SIZE,
      // Cache is measured in bytes.
      length: function (value) {
        function lengthOrZero (field) {
          return field ? field.length : 0;
        }
        return lengthOrZero(value.head) + lengthOrZero(value.body) +
          lengthOrZero(value.js);
      }
    });
  }

  processFilesForTarget(files) {
    var bodyAttrs = {};
    var bodyAttrsOrigin = {};

    files.forEach((file) => {
      var scanned = this.doHTMLScanning(file, html_scanner);

      // failed to parse?
      if (! scanned)
        return;

      Object.keys(scanned.bodyAttrs).forEach((attr) => {
        var val = scanned.bodyAttrs[attr];
        if (bodyAttrs.hasOwnProperty(attr) && bodyAttrs[attr] !== val) {
          // two conflicting attributes on <body> tags in two different template
          // files
          var conflictingFilesStr = [bodyAttrsOrigin[attr], file].map((f) => {
            return f.getPathInPackage();
          }).join(', ');

          file.error({
            message: [
              "<body> declarations have conflicting values for the '",
              attr,
              "' attribute in the following files: ",
              conflictingFilesStr,
              "."
            ].join('')
          });
          return;
        }

        bodyAttrs[attr] = val;
        bodyAttrsOrigin[attr] = file;
      });
    });
  }

  doHTMLScanning(inputFile, htmlScanner) {
    var cacheKey = inputFile.getSourceHash();
    var results = this._cache.get(cacheKey);

    if (! results) {
      var contents = inputFile.getContentsAsString();
      try {
        // Note: the path is only used for errors, so it doesn't have to be part
        // of the cache key.
        results = htmlScanner.scan(contents, inputFile.getPathInPackage());
      } catch (e) {
        if ((e instanceof htmlScanner.ParseError) ||
            (e instanceof htmlScanner.BodyAttrsError)) {
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
      var filePath = inputFile.getPathInPackage();
      var pathPart = path.dirname(filePath);
      if (pathPart === '.')
        pathPart = '';
      if (pathPart.length && pathPart !== path.sep)
        pathPart = pathPart + path.sep;
      var ext = path.extname(filePath);
      var basename = path.basename(filePath, ext);

      // XXX generate a source map

      inputFile.addJavaScript({
        path: path.join(pathPart, "template." + basename + ".js"),
        data: results.js
      });
    }

    return {
      bodyAttrs: results.bodyAttrs
    };
  }
};

Plugin.registerCompiler({
  extensions: ['html'],
  archMatching: 'web',
  isTemplate: true
}, function () {
    return new TemplateCompiler();
});

