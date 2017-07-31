var path          = require('path');
var esutils       = require('esutils');
var Meta          = require('./meta-class');
var tagName       = require('../tag/name');
var eventName     = require('../tag/event');
var VNode         = require('vei-vdom').VirtualNode;
var VText         = require('vei-vdom').VirtualText;
var VJSX          = require('vei-vdom').VirtualJSX;
var VProp         = require('vei-vdom').VirtualProp;
var parse         = path.parse;
var resolve       = path.resolve;
var cid           = 0;


module.exports = function (path, state, t, meta, classes) {
  return createVisitor(path, state, t, meta, classes);
}

function createVisitor(path, state, t, meta, classes) {
  var file      = state.file;
  var code      = file.code;

  var argv = [meta, t, code, classes, path, state, file];

  return {
    'ExportDefaultDeclaration': exportDefaultDeclaration.apply(null, argv),
    'ImportDeclaration':        importDeclaration.apply(null, argv),
    'ClassDeclaration':         classDeclaration.apply(null, argv) 
  };
}

function exportDefaultDeclaration (meta) {
  return function (path) {
    var node        = path.node;
    var declaration = node.declaration;

    if (declaration.type === 'ClassDeclaration') {
      meta.exports.set('default', declaration.id.name);
    }
  }
}

function importDeclaration (meta, t, code, classes, path, state, file) {
  var argv = arguments;


  return function (path) {
    var node  = path.node;
    var value = node.source.value;
    var isStyleSheet = node.specifiers.length === 0 &&
        /\.(css|less|scss)$/g.test(value);

    isStyleSheet ? 
      meta.styleSheet.set(value, true) : 
        path.traverse({
          'ImportDefaultSpecifier': function (path) {
            var node  = path.node;
            var name  = node.local.name;

            meta.imports.set(name, {
              relative: value
            });
          },
          'JSXElement':  jSXElement.apply(null, argv)
        });
  }
}

function classDeclaration (meta, t, code, classes, path, state, file) {
  var argv = Array.prototype.slice.call(arguments);

  return function (path) {
    var node = path.node;
    var name = node.id.name;
    var date = (+new Date() + '').slice(-8);
    var cls  = {
      cid:                date,
      className:          name,
      superClass:         node.superClass ? node.superClass.name : null,
      classProperties:    new Meta.Node(),
      classMethods:       new Meta.Node(),
      classEventMethods:  new Meta.Node()
    };

    meta.classes.set(name, cls);
    classes.set(`${name}_${date}`, cls);

    // argv.unshift(cls);

    path.traverse({
      'ClassMethod': classMethod.apply(null, [cls].concat(argv))
    });
  }
}

function classMethod (cls, meta) {
  var argv = arguments;

  return function (path) {
    var node = path.node;
    var body = node.body.body;
    var name = node.key.name;

    path.traverse({
      'JSXElement': jSXElementToVnode.apply(null, argv)
    });

    cls.classMethods.set(name, true);
  }
}

function jSXElementToVnode (cls, meta, t, code, classes, path, state, file) {
  var rvalue        = /({[\+_\-\*\/~\!\(\)^\&\|\[\]\w\s\?\:,\'\">=<\$]+})/g;
  var replaceValue  = '{$1}';

  cls.dependencies = new Meta.Node();
  cls.jsx          = {
    props: new Meta.Node()
  }

  function toVnode (node) {
    var children = node.children;
    var opening;
    var value;
    var name;
    var props;
    var dep;

    if (children) {
      if (children.length > 0) {
        children = children.map(function (node) {
          return toVnode(node);
        });
      }
    }

    switch (node.type) {
      case 'JSXExpressionContainer':
        return new VJSX(node.expression.name);

        break;
      case 'JSXText':
        value = node.value || '';
        
        return new VText(value/*value.replace(rvalue, replaceValue)*/);

      case 'JSXElement':
        opening = node.openingElement;
        name    = opening.name.name;
        props   = toProps(opening);

        if (!tagName[name]) {
          dep = meta.imports.get(name);

          cls.dependencies.set(name, dep);  
        }

        return new VNode(name, props, children, 1);
    }
  }

  function toProps (node) {
    var attributes = node.attributes;
    var props      = {};

    attributes.forEach(function (attr) {
      var name;
      var value;

      if (attr.type === 'JSXAttribute') {
        if (attr.name.namespace) {
          name  = attr.name.namespace.name + ':' + attr.name.name.name;
        } else {
          name  = attr.name.name;
        }

        value = attr.value;

        name        = eventName[name] || name;
        value       = toValue(value);

        props[name] = new VProp(name, value);

        if (eventName[name]) {
          cls.classEventMethods.set(name, value);
        }        
      }
    });

    return props;
  }

  function toValue (node) {
    var value;
    var expr;

    switch (node.type) {
      case 'JSXExpressionContainer':
        expr = node.expression;

        if (
          expr.type === 'Identifier'      ||
          expr.type === 'BooleanLiteral'  ||
          expr.type === 'NumericLiteral'  ||
          expr.type === 'NullLiteral'     ||
          expr.type === 'RegExpLiteral'   ||
          expr.type === 'BooleanLiteral'
        ) {
          return {
            type:   'identifier',
            value:  expr.value || expr.name
          }
        }
        
        return {
          type:   'identifier',
          value:  code.slice(expr.start, expr.end)
        }
        break;
      default:
        return {
          type:   'literal',
          value:  node.value
        }
    }

    return value /*value.replace(rvalue, replaceValue)*/;
  }

  return function (path) {
    if (!cls.vnode) {
      cls.vnode = toVnode(path.node);
    }
  }
}

function jSXElement (meta, t, complete, code, classes, path, state, file) {
  
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
      node.name = t.stringLiteral(node.name.name);
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
        propExpr,
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