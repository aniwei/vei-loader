var path          = require('path');
var Meta          = require('./meta-class');
var tagName       = require('../tag/name');
var eventName     = require('../tag/event');
var VNode         = require('vei-vdom').VirtualNode;
var VText         = require('vei-vdom').VirtualText;
var VJSX          = require('vei-vdom').VirtualJSX;
var VProp         = require('vei-vdom').VirtualProp;
var cid           = 0;

module.exports = function (path, state, t, meta) {
  return createVisitor(path, state, t, meta);
}

function createVisitor(path, state, t, meta) {
  var file      = state.file;
  var code      = file.code;

  var argv = [meta, t, code, path, state, file];

  return {
    'ExportDefaultDeclaration': exportDefaultDeclaration.apply(null, argv),
    'ImportDeclaration':        importDeclaration.apply(null, argv),
    'ClassDeclaration':         classDeclaration.apply(null, argv),
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

function importDeclaration (meta, t, code, path, state, file) {
  var argv = arguments;


  return function (path) {
    var node  = path.node;
    var value = node.source.value;
  
    path.traverse({
      'ImportDefaultSpecifier': function (path) {
        var node  = path.node;
        var name  = node.local.name;

        meta.imports.set(name, {
          relative: value
        });
      }
    });
  }
}

function classDeclaration (meta, t, code, path, state, file) {
  var argv = Array.prototype.slice.call(arguments);

  return function (path) {
    var node = path.node;
    var name = node.id.name;
    var cls  = meta.classes.get(name);

    if (cls) {
       path.traverse({
        'ClassMethod': classMethod.apply(null, [cls].concat(argv))
      });
    }
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

function jSXElementToVnode (cls, meta, t, code, path, state, file) {

  function toVnode (node) {
    var children = node.children;
    var opening;
    var value;
    var name;
    var props;
    var dep;
    var viewid;

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
        
        return new VText(value);

      case 'JSXElement':
        opening = node.openingElement;
        name    = opening.name.name;
        props   = toProps(opening);

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

    return value;
  }

  return function (path) {
    if (!cls.vnode) {
      cls.vnode = toVnode(path.node);
    }
  }
}
