var tagName = require('../tag/name');
var vid     = 0;

module.exports = function (path, state, t, meta) {
  return createVisitor(path, state, t, meta);
}

function createVisitor(path, state, t, meta) {
  var argv = [meta, t];

  return {
    'JSXElement': jSXElement.apply(null, argv)
  };
}

function jSXElement (meta, t) {
  return function (path) {
    var node = path.get('openingElement').node;
    var attributes;
    var name = node.name.name;

    if (!tagName[name]) {
      if (node) {
        attributes = node.attributes;

        attributes.push(
          t.jSXAttribute(
            t.jSXIdentifier(
              '__viewid__'
            ),
            t.stringLiteral(String(vid++))
          )
        );
      }
    }
  }
}
