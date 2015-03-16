var fs = require('fs')
  , path = require('path');

module.exports = {

  beforeRender: function (config, resolve, reject) {
    config.foo = 'bar';
    resolve();
  }

}
