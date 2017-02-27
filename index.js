#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var YAML = require('yamljs');
var transformEndpoints = require('./lib/transformEndpoints');
var transformModels = require('./lib/transformModels');

var TARGET_YAML_FILE = 'swagger.yaml';
var TARGET_JSON_FILE = 'swagger.json';
var TARGET_HTML_DIR = './html';

var args = process.argv.slice(2);
var srcDir = process.cwd();

var mode = 'yaml';

if (args.indexOf('--json') != -1 || args.indexOf('-j') != -1) {
    mode = 'json'
} else if (args.indexOf('--html') != -1 || args.indexOf('-h') != -1) {
    mode = 'html'
}

var yamlSpec = [
    fs.readFileSync(path.join(srcDir, 'header.yaml'), 'utf-8'),
    transformEndpoints(fs.readFileSync(path.join(srcDir, 'endpoints.tinyspec'), 'utf-8')),
    transformModels(fs.readFileSync(path.join(srcDir, 'models.tinyspec'), 'utf-8'))
].join('');

switch (mode) {
    case 'yaml':
        fs.writeFileSync(path.join(srcDir, TARGET_YAML_FILE), yamlSpec);
        break;
    case 'json':
        generateJson(yamlSpec);
        break;
    case 'html':
        var needCleanup = !fs.existsSync(TARGET_JSON_FILE);
        generateJson(yamlSpec);
        generateHtml(TARGET_JSON_FILE, TARGET_HTML_DIR)
            .then(function () {
                if (needCleanup) {
                    fs.unlinkSync(TARGET_JSON_FILE);
                }
            });
        break;
}

function generateJson(yamlSpec) {
    fs.writeFileSync(
        path.join(srcDir, TARGET_JSON_FILE),
        JSON.stringify(YAML.parse(yamlSpec), null, '  ')
    );
}

function generateHtml(json, target) {
    return require('bootprint')
        .load(require('bootprint-openapi'))
        .build(json, target)
        .generate()
        .then(console.log);
}