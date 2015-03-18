var _ = require('lodash');

/*
 * Determines whether a string is a
 * valid Git URL; tests against a
 * regular expression.
 * @param {String} str - String to test
 * @return {Boolean} - is `str` a git URL
 */

exports.isGitURL = function (str) {
  return /(?:[A-Za-z0-9]+@|https?:\/\/)[A-Za-z0-9.]+(?::|\/)[A-Za-z0-9\/]+(?:\.git)?/.test(str);
}

/*
 * Parse an array of key/value pairs delimited
 * with `=` (i.e. `foo=bar`) into an object.
 * @param {Array} arr - Array to parse
 * @return {Object} - resulting object.
 */

exports.parseKeyValuesArray = function (arr) {
  var kV;
  return _.reduce(arr,
    function (memo, keyValue) {
      kV = keyValue.split('=');
      if (kV.length == 2) {
        if (kV[1] == 'true') {
          kV[1] = true;
        } else if (kV[1] == 'false') {
          kV[1] = false;
        } else if (!isNaN(kV[1])) {
          kV[1] = parseFloat(kV[1]);
        }
        memo[kV[0]] = kV[1];
      }
      return memo;
    }, {}
  )
}
