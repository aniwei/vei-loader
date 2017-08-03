var path        = require('path');
var babel       = require('babel-core');
var fs          = require('fs');
var Meta        = require('./meta-class');

module.exports = function (source) {
  return singleFile(source);
}

function singleFile (file) {
  var plugins = [];
  var meta    = new Meta(file);
  var param   = {
    meta: function () { return meta }
  }
  
  plugins.push([
    path.join(__dirname, './visitor.js'), 
    param
  ]);

  var res = babel.transform(file, {
    presets: ['stage-0'],
    plugins: plugins,
    // sourceMap: 'inline'
  });

  meta.compiled = res.code;

  return meta;
}
