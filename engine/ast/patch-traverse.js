var tagName     = require('../tag/name');


module.exports = function (path, state, t, meta) {
  return createVisitor(path, state, t, meta);
}

function createVisitor(path, state, t, meta) {
  var argv = [meta, t];

  return {
    'ClassDeclaration':   classDeclaration.apply(null, argv)
  };
}

function jSXElement (cls, meta, t) {
  return function (path) {
    var node = path.get('openingElement').node;
    var name = node.name.name;
    var elements;
    var attributes;

    if (!tagName[name]) {
      if (node) {
        attributes = node.attributes;

        elements = cls.classEventMethods.all().map(function (node) {
          return t.stringLiteral(node.value.value);
        });

        attributes.push(
          t.jSXAttribute(
            t.jSXIdentifier(
              '__view_metods__'
            ),
            t.JSXExpressionContainer(t.arrayExpression(elements))
          )
        );
      }
    }
  }
}

function classDeclaration (meta, t) {
  var argv = Array.prototype.slice.call(arguments);

  function constructorMethod (body) {
    var node;
    var paramExpr;
    var bodyExpr;
    var callExpr;
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

      callExpr = t.CallExpression(
        t.super(),
        [
          t.identifier('props'),
          t.identifier('context')
        ]
      );

      bodyExpr = t.blockStatement(
        [
          t.expressionStatement(
            callExpr
          )
        ]
      );

      node = t.classMethod(
        'method', 
        t.identifier('constructor'),
        paramExpr,
        bodyExpr
      );

      body.push(node);
    }
  }

  return function (path) {
    var node = path.node;
    var name = node.id.name;
    var cls  = meta.classes.get(name);

    constructorMethod(node.body.body);
    
    path.traverse({
      'ClassMethod': classMethod.apply(null, [cls].concat(argv))
    });
  }
}

function classMethod (cls, meta, t) {
  var argv = arguments;

  function methodsMember (body) {
    var elements = cls.classEventMethods.all().map(function (node) {
      return t.stringLiteral(node.value.value);
    });

    if (elements.length > 0) {
      memberExpression(body, '__view_methods__', t.arrayExpression(elements));
    }
  }

  function memberExpression (body, left, right) {
    var exprStatement;
    var assignment;
    var memberExpr;

    memberExpr = t.memberExpression(
      t.thisExpression(),
      t.identifier(left)
    );

    assignment = t.assignmentExpression(
      '=',
      memberExpr,
      right
    )

    exprStatement = t.expressionStatement(
      assignment
    );

    body.push(exprStatement);
  }

  return function (path) {
    var node  = path.node;
    var body  = node.body.body;
    var name  = node.key.name;
    var vnode = cls.vnode;
    
    switch (name) {
      case 'constructor':
        methodsMember(body);

        break;
    }

  }
}
