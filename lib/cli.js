var Sprout = require('./')
  , Emitter = require('events').EventEmitter
  , helpers = require('./helpers')
  , inquirer = require('inquirer')
  , Promise = require('bluebird')
  , path = require('path')
  , _ = require('lodash');

module.exports = (function () {

  /*
   * The methods publicly available to
   * the CLI.  Executed with `CLI`
   * instance.
   */

  var methods = {

    /*
     * Add a template.
     * @param {Object} options - CLI arguments.
     */

    add: function (options) {
      var self = this
        , name = options.name
        , src = helpers.isGitURL(options.src) ? options.src : path.resolve(process.cwd(), options.src);
      return this.sprout.add(name, src).then(
        function () {
          return self.emitter.emit('success', 'template `' + name + '` from ' + src + ' added!');
        }
      );
    },

    /*
     * Remove a template.
     * @param {Object} options - CLI arguments.
     */

    remove: function (options) {
      var self = this
        , name = options.name;
      return this.sprout.remove(name).then(
        function () {
          return self.emitter.emit('success', 'template `' + name + '` removed!');
        }
      );
    },

    /*
     * List all templates.
     * @param {Object} options - CLI arguments.
     */

    list: function (options) {
      var self = this;
      return new Promise(
        function (resolve, reject) {
          if (_.isEmpty(self.sprout.templates)) {
            self.emitter.emit('error', new Error('no templates exist!'));
          } else {
            self.emitter.emit('list', _.keys(self.sprout.templates));
          }
          return resolve();
        }
      )
    },

    /*
     * Initialize a template.
     * @param {Object} options - CLI arguments.
     */

    init: function (options) {
      var self = this
        , name = options.name
        , target = path.resolve(process.cwd(), options.target);
      if (_.isArray(options.locals)) {
        options.locals = helpers.parseKeyValuesArray(options.locals);
      }
      if (options.config) {
        options.config = path.resolve(process.cwd(), options.config);
      }
      options.questionnaire = questionnaire;
      return this.sprout.init(name, target, _.omit(options, 'name', 'target')).then(
        function () {
          return self.emitter.emit('success', 'template `' + name + '` initialized at ' + target + '!');
        }
      );
    }

  }

  /*
   * Returns a CLI instance.
   * @return {Function} CLI instance.
   */

  var CLI = function (p) {
    this.sprout = new Sprout(path.resolve(process.cwd(), p));
    this.emitter = this.sprout.emitter;
  }

  CLI.prototype = {

    /*
     * Run the CLI based on the arguments passed.
     * @param {Object} args - CLI arguments.
     * @returns {Promise} - a Promise with no return value.
     */

    run: function (args) {
      var self = this
        , action = args.action;
      return methods[action].call(this, _.omit(args, 'action')).catch(
        function (error) {
          return self.emitter.emit('error', error);
        }
      );
    }

  }

  /*
   * A helper function for calling Inquirer.
   * Passed to `cli.init` to be called when
   * `template.init` would like answers.
   * @param {Array} questions - questions to inquire about.
   * @param {Array} skip - names of questions to skip.
   * @returns {Promise} - a promise with the answers.
   */

  var questionnaire = function (questions, skip) {
    return new Promise(
      function (resolve) {
        var qs = []
          , question;
        for (var i=0; i<questions.length; i++) {
          question = questions[i];
          if (!_.contains(skip, question.name)) {
            qs.push(question);
          }
        }
        return inquirer.prompt(qs,
          function (answers) {
            return resolve(answers);
          }
        )
      }
    );
  }

  return CLI;

}.call(this));
