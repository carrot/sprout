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
