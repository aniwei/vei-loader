var jsxVisitor    = require('./jsx');
var classVisitor  = require('./class');

module.exports = function (babel) {
  var t = babel.types;

  return {
    inherits: require('babel-plugin-syntax-jsx'),
    visitor: {
      Program: function (path, state) {
        var opts    = state.opts;
        var meta    = opts.meta();
        var classes = opts.classes();

        path.traverse(classVisitor(path, state, meta, classes, t, babel));
        path.traverse(jsxVisitor(path, state, meta, classes, t, babel));
      }
    }
  }
}