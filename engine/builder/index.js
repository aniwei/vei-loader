var fs        = require('fs');
var path      = require('path');
var kebabcase = require('lodash.kebabcase');
var tagName   = require('../tag/name');
var eventName = require('../tag/event');
var VNode     = require('vei-vdom').VirtualNode;
var VProp     = require('vei-vdom').VirtualProp;

module.exports = function (cls, meta) {
  if (cls.vnode) {
    fileForXML(cls, meta, this) ;
  }
}



function fileForXML (cls, meta, loader) {
  var vnode         = cls.vnode;
  var file          = meta.filename;
  var className     = kebabcase(cls.className || '');
  var rvalue        = /({[\+_\-\*\/~\!\(\)^\&\|\[\]\w\s\?\:,\'\">=<\$]+})/g;
  var replaceValue  = '{{$1}}';
  var imports       = [];

  vnode.forEach(function (vnode) {
    var value;
    var props;
    var type;
    var propsMap;
    var src;
    var relative;
    var impt;

    if (!tagName[vnode.type]) {
      type        = vnode.type;
      props       = vnode.allProperties();

      if (impt = meta.imports.get(type)) {
        relative = path.parse(impt.relative);

        src = path.join(relative.dir, 'index.view.wxml');
      } else {
        src = `${kebabcase(type)}.view.wxml`;
      }

      vnode.type  = 'template';
      vnode.props = {
        is:     kebabcase(type)
      };

      if (props && props.length > 0) {
        vnode.props.data = `{${stringify(props)}}`;
      }

      imports.push(
        `<import src="${src}" />`
      );
    } else {
      switch (vnode.vtype) {
        case 3:
          value = vnode.text || '';

          vnode.text = value.replace(rvalue, replaceValue);
          break;
        case 1:
        case 2: 
          vnode.everyProperty(function (key, prop, props) {
            if (prop) {
              if (eventName[key]) {
                prop.name = eventName[key];
                prop.value.value = `{{__viewid__}}.${prop.value.value}`;
              }

              props[key] = prop.stringify();
            }
          });
          break;
      }
    }

  });

  var vnodeString = vnode.stringify();

  if (imports.length > 0) {
    vnodeString = imports.join('') + vnode.stringify()
  }

  var defaultClass = meta.exports.get('default');
  var filename     = defaultClass === cls.className ? 'index' : className;

  loader.emitFile(
    path.join(meta.dist, `${filename}.wxml`), 
    vnodeString
  );

  vnodeString = `<template name="${className}">${vnodeString}</template>`;

  loader.emitFile(
    path.join(meta.dist, `${filename}.view.wxml`), 
    vnodeString
  );
}

function stringify (props) {
  var propsString;

  propsString = props.map(function (prop) {
    var propValue = prop.value;
    var node      = propValue.value;
    var value     = node.value;

    switch (node.type) {
      case 'literal':
        if (typeof value === 'string') {
          value = value.replace('"', '\'');
        }
        return `${prop.key}: '${value}'`;

      case 'identifier':
        return `${prop.key}: ${value}`;
    }
  }).join(', ');


  return `{ ${propsString} }`;
}