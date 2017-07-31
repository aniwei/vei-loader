var xmlTraverse = require('./xml-traverse');
var cslTraverse = require('./cls-traverse');

module.exports = function (babel) {
  var t = babel.types;

  return {
    inherits: require('babel-plugin-syntax-jsx'),
    visitor: {
      Program: function (path, state) {
        var complete = state.opts.complete;
        var classes  = state.opts.getClasses();
        var meta     = state.opts.getMeta();

        path.traverse(xmlTraverse(path, state, t, meta, classes));
        path.traverse(cslTraverse(path, state, t, meta, classes));
      }
    }
  }
}