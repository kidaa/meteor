Package.describe({
  name: 'caching-html-compiler',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
  "lru-cache": "2.6.4"
});

Package.onUse(function(api) {
  api.use([
    'minifiers',
    'spacebars-compiler',
    'ecmascript',
    'html-scanner',
  ]);

  api.addFiles('caching-html-compiler.js');
  api.export("CachingHTMLCompiler");
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('caching-html-compiler');
  api.addFiles('caching-html-compiler-tests.js');
});
