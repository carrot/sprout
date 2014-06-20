var chai = require('chai'),
    chai_fs = require('chai-fs'),
    chai_promise = require('chai-as-promised'),
    path = require('path'),
    sprout = require('../..');

var should = chai.should();

chai.use(chai_fs);
chai.use(chai_promise);

global.chai = chai;
global.sprout = sprout;
global.should = should;
global._path = path.join(__dirname, '../fixtures')
