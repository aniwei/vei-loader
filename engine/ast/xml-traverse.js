var path    = require('path');
var esutils = require('esutils');
var he      = require('he');
var tagName = require('../tag/name');
var Meta    = require('../ast/meta-class');
var parse   = path.parse;
var join    = path.join;


module.exports = function (path, state, t, meta) {
  return createVisitor(path, state, t, meta);
}

function createVisitor (path, state, types, meta) {
  var file      = state.file;
  var code      = file.code;

  var argv = [types, file];

  return {
    'JSXElement': jSXElement.apply(null, argv)
  }
}

function classDeclaration (meta) {
  var argv = Array.prototype.slice.call(arguments);
  
  return function (path) {
    var node = path.node;
    var cls  = meta.classes.get(node.id.name);
    var body = node.body.body;
  
    if (cls) {
      path.traverse({
        'JSXElement': jSXElement.apply(null, argv)
      });
    }
  }
}

function jSXElement (t, file) {
  
  function toJSXIdentifier (node, parent) {
    if (t.isJSXIdentifier(node)) {
      if (node.name === 'this' && t.isReferenced(node, parent)) {
        return t.thisExpression();
      } else if (esutils.keyword.isIdentifierNameES6(node.name)) {
        node.type = 'Identifier'
      } else {
        return t.stringLiteral(node.name)
      }
    } else if (t.isJSXMemberExpression(node)) {
      return t.memberExpression(
        toJSXIdentifier(node.object, node),
        toJSXIdentifier(node.property, node)
      )
    }

    return node;
  }

  function toAttributeValue (node) {
    return t.isJSXExpressionContainer(node) ?
      node.expression : node;
  }

  function toAttribute (node) {
    var value = toAttributeValue(node.value || t.booleanLiteral(true));
    var string;

    if (t.isStringLiteral(value) && !t.isJSXExpressionContainer(node.value)) {
      value.value = value.value.replace(/\n\s+/g, ' ');
    }

    if (t.isValidIdentifier(node.name.name)) {
      node.name.type = 'Identifier';
    } else {
      if (node.name.type === 'JSXNamespacedName') {
        node.name = t.stringLiteral(node.name.namespace.name + ':' + node.name.name.name);
      } else {
        node.name = t.stringLiteral(node.name.name);
      }
    }

    return t.inherits(t.objectProperty(node.name, value), node);
  }

  function toJSXAttribute (attributes, file) { 
    let props = [];
    const objects = [];

    const useBuiltIns = file.opts.useBuiltIns || false;
    if (typeof useBuiltIns !== 'boolean') {
      throw new Error(`transform-react-jsx currently only accepts a boolean option for " +
        "useBuiltIns (defaults to false)`);
    }

    function pushProps() {
      if (!props.length) {
        return;
      }

      objects.push(t.objectExpression(props));
      props = [];
    }

    while (attributes.length) {
      const prop = attributes.shift();

      if (t.isJSXSpreadAttribute(prop)) {
        pushProps();
        objects.push(prop.argument);
      } else {
        props.push(toAttribute(prop));
      }
    }

    pushProps();

    if (objects.length === 1) {
      attributes = objects[0];
    } else {
      if (!t.isObjectExpression(objects[0])) {
        objects.unshift(t.objectExpression([]));
      }

      const helper = useBuiltIns ?
        t.memberExpression(t.identifier('Object'), t.identifier('assign')) :
        file.addHelper('extends');

      // spread it
      attributes = t.callExpression(helper, objects);
    }

    return attributes;   
  }

  function isExistProperty (attributes) {
    var isExist = attributes.some(function (attr) {
      var node = attr.name;
      var name = node.name;

      if (name === '__viewid__') {
        return true;
      }
    });

    if (!isExist) {
      attributes.push(
        t.jSXAttribute(
          t.jSXIdentifier(
            '__viewid__'
          ),
          t.stringLiteral(String(vid.vid))
        )
      );
    }
  }

  return {
    exit: function (path) {
      var opening     = path.get('openingElement'); 
      var argument    = [];
      var attributes  = opening.node.attributes;
      var propExpr;
      var tagExpr;
      var callExpr;
      var tag;

      opening.parent.children = t.react.buildChildren(opening.parent);
      tagExpr              = toJSXIdentifier(opening.node.name, opening.node);
      
      tag = t.isIdentifier(tagExpr) ?
        tagExpr.name : tagExpr.value;
      
      argument.push(
        t.react.isCompatTag(tag) ? 
          t.stringLiteral(tag) : tagExpr
      );

      propExpr = attributes.length > 0 ? 
        toJSXAttribute(attributes, file) : t.nullLiteral();
      
      argument.push(
        propExpr
      );

      argument.push(
        t.arrayExpression(path.node.children)
      );

      tagExpr = t.callExpression(
        t.identifier('createElement'),
        argument
      );

      path.replaceWith(
        t.inherits(
          tagExpr,
          path.node
        )
      );
    }
  }
}