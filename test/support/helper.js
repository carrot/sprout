var chai = require('chai'),
    chai_fs = require('chai-fs'),
    chai_promise = require('chai-as-promised'),
    path = require('path');

process.env.SPROUT_CONFIG_PATH = path.join(__dirname, '.config', 'sprout')

var sprout = require('../..'),
    should = chai.should();

chai.use(chai_fs);
chai.use(chai_promise);

global.chai = chai;
global.sprout = sprout;
global.should = should;
global._path = path.join(__dirname, '../fixtures')
