var eventName     = require('../tag/event');


module.exports = function (path, state, t, meta, classes) {
  return createVisitor(path, state, t, meta, classes);
}

function createVisitor(path, state, t, meta, classes) {
  var file      = state.file;
  var code      = file.code;

  var argv = [meta, t, code, classes, path, state, file];

  return {
    'ClassDeclaration':         classDeclaration.apply(null, argv) 
  };
}


function classDeclaration (meta, t, code, classes, path, state, file) {
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

  function classidMember (body) {
    memberExpression(body, '__view_classid__', t.stringLiteral(cls.cid));
  }

  function eventMethodsMember (body) {
    var elements = cls.classEventMethods.all().map(function (node) {
      return t.stringLiteral(node.value.value);
    });

    memberExpression(body, '__view_events_methods__', t.arrayExpression(elements));
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

  function vnodeEventMethos (vnode) {
    if (vnode) {
      vnode.map(function (v) {
        var props;
        var viewid;

        if (v.vtype < 11) {
          props   = v.allProperties() || [];

          if (props.length > 0) {
            props.forEach(function (prop) {
              var name      = prop.key;
              var valueNode = prop.value;
              var value     = valueNode.stringify();
              
              if (eventName[name]) {
                valueNode.value.value = `${cls.cid}.{{__viewid__}}.${value}`;
              }
            });
          }
        }
      });
    }
  }

  return function (path) {
    var node  = path.node;
    var body  = node.body.body;
    var name  = node.key.name;
    var vnode = cls.vnode;
    
    switch (name) {
      case 'constructor':
        classidMember(body);
        eventMethodsMember(body);
        vnodeEventMethos(vnode);

        break;
    }

  }
}
