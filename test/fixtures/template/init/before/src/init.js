var fs = require('fs')
  , path = require('path');

module.exports = {
  before: function (target, resolve, reject) {
    fs.writeFile(path.join(target, 'bar'), '',
      function (err) {
        if (err) return reject();
        return resolve();
      }
    )
  }
}
