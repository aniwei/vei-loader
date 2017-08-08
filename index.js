require('babel-register');

var path    = require('path');
var babel   = require('babel-core');
var Meta    = require('./meta');
var builder = require('./builder');
var classes = new Meta.Node();

module.exports = function (source) {
  var meta        = new Meta();
  var filename    = path.parse(this.resource);

  if (filename.ext === '.vx') {
    var res = babel.transform(source, {
      plugins: [
        [
          path.join(__dirname, 'visitors/index.js'),
          { 
            meta: () => { return meta },
            classes: () => { return classes }
          }
        ]
      ]
    });

    builder(meta, this._compilation.compiler, this);

    return res.code;
  }

  return source;
}
