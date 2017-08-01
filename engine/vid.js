var vid = 0;

Object.defineProperty(module.exports, 'vid', {
  get: function () {
    return vid++;
  }
});