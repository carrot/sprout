var fs = require('fs')
  , path = require('path');

module.exports = {

  after: function (config, resolve, reject) {
    fs.writeFileSync(path.join(__dirname, 'bar'), 'foo');
    resolve();
  }

}
