var chai = require('chai'),
    chai_fs = require('chai-fs'),
    path = require('path'),
    sprout = require('../..');

var should = chai.should();

chai.use(chai_fs);

global.chai = chai;
global.sprout = sprout;
global.should = should;
global._path = path.join(__dirname, '../fixtures')
