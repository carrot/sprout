var fs = require('fs')
  , path = require('path');

module.exports = {

  beforeRender: function (target, config, resolve, reject) {
    config.bar = 'foo';
    resolve();
  }

}
