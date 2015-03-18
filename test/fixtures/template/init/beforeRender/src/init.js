module.exports = {
  beforeRender: function (target, config, resolve, reject) {
    resolve(config.foo = 'foo');
  }
}
