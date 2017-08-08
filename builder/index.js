var fs    = require('fs');
var path  = require('path');
var vei   = require('vei');

function exists (output) {
  var exist     = fs.existsSync(output);

  if (!exist) {
    fs.mkdirSync(output);
  }
}

module.exports = function (meta, compiler, loader) {
  var output      = compiler.outputPath;
  var xmlfile     = path.join(output, 'xml');
  var filename    = path.relative(compiler.context, loader.resource);
  var parsed      = path.parse(filename);
  var dir         = parsed.dir.split(path.sep);
  var classes     = meta.classes.all();

  dir.shift();
  exists(xmlfile);
  
  classes.forEach(function (node) {
    var cls         = node.value;
    var className   = cls.name;
    var methods     = cls.methods.all();

    methods.forEach(function (node) {
      var method = node.value;
      var vdom   = method.vdom;
      var xml;

      if (node.name === 'render') {
        xml = vdom.stringify();
        
        // loader.emitFile(`${dir.join(path.sep)}/index.wxml`,xml);
        xml = `<template name="${dir.join('.')}.${className}">${xml}</template>`;

        loader.emitFile(`xml/${dir.join('.')}.${className}.wxml`, xml);
        loader.emitFile(`${dir.join(path.sep)}/index.wxml`, `<import src="index.view.wxml"/><template is="${dir.join('.')}.${className}.view" data="{{ ${className}: ${className} }}"></template>`);
        loader.emitFile(`${dir.join(path.sep)}/index.view.wxml`, `<template name="${dir.join('.')}.${className}.view"><import src="${path.relative(path.join(output, dir.join('/')), xmlfile)}${path.sep}${dir.join('.')}.${className}.wxml"/><template is="${dir.join('.')}.${className}" data="{{ ...${className} }}"></template></template>`);
      }
    });
  });

}
