module.exports = Meta;

Meta.Node = Node;

function Meta (code) {
  this.classes      = new Node();
  this.dependencies = new Node();
}

function Node () {
  this.index = 0;
  this.name  = {};
  this.list  = {};
}

Node.prototype = {
  get: function (name) {
    var index = this.name[name];

    if (!(typeof index === 'undefined')) {
      return this.list[index];
    }
  },

  set: function (name, value) {
    var index = this.index + 1;

    if (!(value === undefined)) {
      this.name[name]   = index;
      this.list[index]  = value;

      this.index = index;
    }
  },

  remove: function (name) {
    var index = this.name[name];

    if (!(typeof index === 'undefined')) {
      delete this.name[name];
      delete this.list[index];
    }
  },

  exist: function (name) {
    var index = this.name[name]

    if (index === 'number') {
      return this.list[index];
    }

    return false;
  },

  forEach: function (it) {
    this.map(it);
  },

  map: function (it) {
    var keys = Object.keys(this.name);

    if (typeof it === 'function') {
      keys.map((function (key) {
        var li = this.list[key];

        it(li);
      }).bind(this));
    }
  },

  all: function () {
    var list = this.list;
    var name = this.name;
    var keys = Object.keys(name);

    return keys.map(function (key) {
      var i = name[key];

      return {
        name:   key,
        value:  list[i],
        id:     i
      }
    });
  }
}



