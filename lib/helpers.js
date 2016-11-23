import isBinary from 'isbinaryfile'

/*
 * Determines whether a string is a valid Git URL tests against a regular
 * expression.
 * @param {String} str - String to test
 * @return {Boolean} - is `str` a git URL
 */
export function isGitUrl (str) {
  return /(?:[A-Za-z0-9]+@|https?:\/\/)[A-Za-z0-9.]+(?::|\/)[A-Za-z0-9/]+(?:\.git)?/.test(str)
}

/*
 * A decent check to determine whether a given file is a binary.
 * @param {Array} src - Path the file
 * @return {Boolean} - whether given file is binary
 */
export function isBinaryFile (src) {
  return isBinary.sync(src)
}
