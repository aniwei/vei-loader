var babel     = require('babel-core');
var path      = require('path');
var fs        = require('fs');

module.exports = function (file, classes) {
  return singleFile(file, classes);
}


function singleFile (file, classes) {
  var plugins = [];
  var complete;
  var meta;
  var res;

  plugins.push([
    path.join(__dirname, './class-visitor.js'), { meta: file, classes: classes }
  ]);

  res = babel.transform(file.code, {
    presets: ['stage-0'],
    plugins: plugins,
    sourceMaps: 'inline'
  });

  file.code = res.code;

  return file;
}
