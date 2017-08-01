var path    = require('path');
var ast     = require('./engine/ast/index.js');
var compile = require('./engine/compile/index.js');
var builder = require('./engine/builder/index.js');


module.exports = function (source) {
  var resource    = this.resource;
  var sourcePath  = this.resourcePath;
  var compiler    = this._compiler;
  var options     = this.options;
  var res         = ast(source);
  var commonPath;
  var complied;
  var classes;
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

  res.meta.filename = resource;
  
  compiled  = compile(res.meta, res.classes);
  classes   = compiled.classes.all();

  compiled.dist = entry;

  classes.forEach((function (cls) {
    builder.call(this, cls.value, compiled);
  }).bind(this));
  
  return compiled.code;
}
