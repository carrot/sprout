var fs = require('fs')
  , path = require('path');

module.exports = {
  after: function (utils, config) {
    return utils.write('bar', '');
  }
}
