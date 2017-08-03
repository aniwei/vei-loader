var vdomTraverse = require('./vdom-traverse');
var patchTraverse  = require('./patch-traverse');
var xmlTraverse  = require('./xml-traverse');
var jsxTraverse  = require('./jsx-traverse');
var classTraverse  = require('./class-traverse');

module.exports = function (babel) {
  var t = babel.types;

  return {
    inherits: require('babel-plugin-syntax-jsx'),
    visitor: {
      Program: function (path, state) {
        var file     = state.file;
        var meta     = state.opts.meta();
        path.traverse(jsxTraverse(path, state, t, meta));

        path.traverse(classTraverse(path, state, t, meta));
        
        path.traverse(patchTraverse(path, state, t, meta));

        path.traverse(vdomTraverse(path, state, t, meta));

        path.traverse(xmlTraverse(path, state, t, meta));
      }
    }
  }
}