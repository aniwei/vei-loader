var path    = require('path');
var ast     = require('./engine/ast/index.js');
var compile = require('./engine/compile/index.js');
var builder = require('./engine/builder/index.js');


module.exports = function (source) {
  var resource    = this.resource;
  var sourcePath  = this.resourcePath;
  var compiler    = this._compiler;
  var options     = this.options;
  var meta        = ast(source);
  var output;
  var entry;
  var keys;
  
  output      = compiler.outputPath;
  keys        = Object.getOwnPropertyNames(options.entry);
  
  keys.some(function (key) {
    if (options.entry[key] === sourcePath) {
      return entry = key;
    }
  });

  if (!entry) {
    entry = path.relative(this.query.root, this.context);
  }

  meta.filename = resource;
  meta.dist = entry;

  console.log(this.resource);
  console.log(meta.classes.all()[0])

  meta.classes.all().forEach((function (cls) {
    builder.call(this, cls.value, meta);
  }).bind(this));
  
  return meta.compiled;
}
