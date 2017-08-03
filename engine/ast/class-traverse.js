var path          = require('path');
var Meta          = require('./meta-class');
var tagName       = require('../tag/name');
var eventName     = require('../tag/event');
var cid           = 0;


module.exports = function (path, state, t, meta) {
  return createVisitor(path, state, t, meta);
}

function createVisitor(path, state, t, meta) {
  var file      = state.file;
  var code      = file.code;

  var argv = [meta, t, code];

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

function importDeclaration (meta, t, code) {
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

function classDeclaration (meta, t, code) {
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

function jSXElementToVnode (cls, meta, t, code) {

  function everyElement (node) {
    var children = node.children;
    var opening;

    if (children) {
      if (children.length > 0) {
        children = children.map(function (node) {
          return everyElement(node);
        });
      }
    }

    if (node.type === 'JSXElement') {
      opening = node.openingElement;
      everyProps(opening);
    }
  }

  function everyProps (node) {
    var attributes = node.attributes;

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

        name        = eventName[name];
        value       = toValue(value);

        if (name) {
          cls.classEventMethods.set(name, value);
        }        
      }
    });
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
    everyElement(path.node);
  }
}
