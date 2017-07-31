var path    = require('path');
var esutils = require('esutils');
var Meta    = require('../ast/meta-class');
var parse   = path.parse;
var join    = path.join;

module.exports = function (path, state, t, meta, classes) {
  return createVisitor(path, state, t, meta, classes);
}

function createVisitor (path, state, types, meta, classes) {
  var file      = state.file;
  var code      = file.code;

  var argv = [types, file];
  // meta, t, complete, code, classes, path, state, file

  return {
    'JSXElement': jSXElement.apply(null, argv)
  }
}

function classDeclaration (classes, meta) {
  var argv = Array.prototype.slice.call(arguments);

  function constructorMethod (body) {
    var node;
    var paramExpr;
    var bodyExpr;
    var exist = body.some(function (node) {
      var key = node.key;

      if (node.type === 'ClassMethod') {
        if (key.name === 'constructor') {
          return true;
        }
      }
    });

    if (!exist) {
      paramExpr = [
        t.identifier('props'),
        t.identifier('context')
      ];

      bodyExpr = t.blockStatement(
        []
      );

      node = t.classMethod(
        'method', 
        t.identifier('constructor'),
        paramExpr,
        bodyExpr
      )
    }
  }

  
  return function (path) {
    var node = path.node;
    var cls  = meta.classes.get(node.id.name);
    var body = node.body.body;

    // constructorMethod(body);
  
    if (cls) {
      // argv.unshift(cls.dependencies.all());

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
    const value = toAttributeValue(node.value || t.booleanLiteral(true));

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
      // only one object
      attributes = objects[0];
    } else {
      // looks like we have multiple objects
      if (!t.isObjectExpression(objs[0])) {
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

  return {
    exit: function (path) {
      var opening     = path.get('openingElement'); 
      var argument    = [];
      var attributes  = opening.node.attributes;
      var propExpr;
      var tagExpr;
      var callExpr;
      var tagName;

      opening.parent.children = t.react.buildChildren(opening.parent);
      tagExpr              = toJSXIdentifier(opening.node.name, opening.node);
      
      tagName = t.isIdentifier(tagExpr) ?
        tagExpr.name : tagExpr.value;
      
      argument.push(
        t.react.isCompatTag(tagName) ? 
          t.stringLiteral(tagName) : tagExpr
      );
      
      propExpr = attributes.length > 0 ? 
        toJSXAttribute(attributes, file) : t.nullLiteral();
      
      argument.push(
        propExpr
      );

      argument.push(
        t.arrayExpression(path.node.children)
      );

      argument.push(
        t.thisExpression()
      )

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