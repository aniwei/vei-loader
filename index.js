var path    = require('path');
var ast     = require('./engine/ast/index.js');
var complie = require('./engine/complie/index.js');
var builder = require('./engine/builder/index.js');


module.exports = function (source) {
  var resource = this.resource;
  var res      = ast(source);
  var complied;
  var classes;
  
  
  res.meta.filename = resource;
  
  complied  = complie(res.meta, res.classes);
  classes   = complied.classes.all();

  classes.forEach((function (cls) {
    builder.call(this, cls.value, complied);
  }).bind(this));
  
  return complied.code;
}
