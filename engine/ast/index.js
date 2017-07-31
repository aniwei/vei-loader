var path        = require('path');
var babel       = require('babel-core');
var fs          = require('fs');
var Meta        = require('./meta-class');
var classes     = new Meta.Node();

module.exports = function (source) {
  var res = singleFile(source);

  return {
    meta:     res,
    classes:  classes
  };
}

function singleFile (file) {
  var plugins = [];
  var meta    = new Meta(file);
  var complete;
  
  var visitorParam = {
    complete:   complete,
    getMeta:    function () {return meta;},
    getClasses: function () {return classes;}
  };

  plugins.push([
    path.join(__dirname, './xml-visitor.js'), visitorParam
  ]);

  var res = babel.transform(file, {
    presets: ['stage-0'],
    plugins: plugins
  });

  meta.code = res.code;

  return meta;
}
