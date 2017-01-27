#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var transformEndpoints = require('./lib/transformEndpoints');
var transformModels = require('./lib/transformModels');

var srcDir = process.cwd();

var parts = [
    fs.readFileSync(path.join(srcDir, 'header.yml'), 'utf-8'),
    transformEndpoints(fs.readFileSync(path.join(srcDir, 'endpoints.tinyspec'), 'utf-8')),
    transformModels(fs.readFileSync(path.join(srcDir, 'models.tinyspec'), 'utf-8'))
];

fs.writeFileSync(path.join(srcDir, 'swagger.yml'), parts.join(''));
