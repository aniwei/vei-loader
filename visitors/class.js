var Meta = require('../meta');
var vei  = require('vei');

module.exports = function (path, state, meta, classes, t) {
  var file = state.file;
  var code = file.code;

  return {
    ClassDeclaration: classDeclaration.apply(null, [meta, classes, t, code])
  }
}

function classDeclaration (meta, classes, t, code) {
  return function (path) {
    var node    = path.node;
    var id      = node.id;
    var cls     = {
      name:           id.name,
      superClass:     node.superClass ? node.superClass.name : null,
      methods:        new Meta.Node(),
      events:         new Meta.Node(),
      data:           new Meta.Node()
    };

    meta.classes.set(id.name, cls);
    classes.set(id.name, cls);

    path.traverse({
      ClassMethod: classMethod.apply(null, [cls, t, code])
    });
  }
}

function classMethod (cls, t, code) {
  function toProps (attributes, prefix) {
    var props      = {};

    attributes.forEach(function (attr) {
      var name;
      var value;

      if (attr.type === 'JSXAttribute') {
        name = attr.name.namespace ?
          attr.name.namespace.name + ':' + attr.name.name.name :
          attr.name.name;

        value = attr.value;
        value = toValue(value, `${prefix}_${name}`);

        props[name] = value;
      }
    });

    return props;
  }

  function toValue (node, prefix) {
    var expr;

    switch (node.type) {
      case 'JSXExpressionContainer':
        return `{{ ${prefix} }}`;
      default:
        return node.value;
    }
  }

  function toVDOM (node, prefix) {
    var vnode;
    var child;
    var props;
    var openElement;
    var expr;

    switch (node.type) {
      case 'JSXElement':
        openElement   = node.openingElement;
        node.children = t.react.buildChildren(node);

        // prefix = prefix ? `${prefix}_${openElement.name.name}` : openElement.name.name;

        prefix = prefix ? `${prefix}` : '$';

        child = node.children.map(function (c, index) {
          return toVDOM(c, `${prefix ? `${prefix}_` : ''}${index}`);
        });

        props = toProps(openElement.attributes, prefix);
        vnode = new vei.JSXElement(openElement.name.name, props, child);

        

        break;

      case 'Identifier':
        vnode = new vei.JSXText(`{{ ${prefix} }}`);

        break;

      case 'JSXText':
        vnode = new vei.JSXText(node.value);
        break;

      case 'JSXExpressionContainer':
        expr  = node.expression;
        vnode = new vei.JSXExpression(expr.type === 'Identifier' ? `{{ ${prefix} }}` : expr.name, expr.type);

        break;

      default:
        vnode = node.value;

        break;
    }

    return vnode;
  }

  function vdomTransform () {

  }

  return function (path) {
    var node        = path.node;
    var key         = node.key;
    var body        = node.body.body;
    var method;

    method = {
      body: body.map(function (node) {
        return node.type;
      }),

      vdom: null
    };

    cls.methods.set(key.name, method);

    path.traverse({
      JSXElement: function (path) {
        var vdom;
        var bindings = path.scope.getAllBindings();

        if (!method.vdom) {
          vdom = toVDOM(path.node);

          vdom.map(function (node) {
            var name = node.type;

            if (name) {
              if (!t.react.isCompatTag(name)) {
                if (name in bindings) {
                  debugger;
                }
              }
            }
          });
                  
          method.vdom = vdom;
        }
      }
    })
  }
}
