var clsTraverse = require('./class-traverse');

module.exports = function (babel) {
  var t = babel.types;

  return {
    inherits: require('babel-plugin-syntax-jsx'),
    visitor: {
      Program: function (path, state) {
        var meta    = state.opts.meta;
        var classes = state.opts.classes;

        path.traverse(clsTraverse(path, state, t, meta, classes));
      }
    }
  }
}