Package.describe({
  name: 'html-scanner',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.use('ecmascript');
  api.use('spacebars-compiler');
  api.addFiles('html-scanner.js');

  api.export('HtmlScanner');
});

Package.onTest(function (api) {
  api.use('tinytest');
  api.use('htmljs');
  api.use('templating');
  api.use('underscore');
  api.use(['test-helpers', 'session', 'tracker',
           'minimongo'], 'client');
  api.use('spacebars-compiler');
  api.use('minifiers'); // ensure compiler output is beautified

  api.addFiles([
    'html-scanner.js',
    'html-scanner-tests.js'
  ], 'server');
});
