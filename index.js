#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');
const bootprint = require('bootprint');
const bootprintOpenapi = require('bootprint-openapi');
const transformEndpoints = require('./lib/transformEndpoints');
const transformModels = require('./lib/transformModels');

const TARGET_YAML_FILE = 'swagger.yaml';
const TARGET_JSON_FILE = 'swagger.json';
const TARGET_HTML_DIR = './docs';

const args = process.argv.slice(2);
const srcDir = process.cwd();

var mode = 'help';

if (args.indexOf('--yaml') != -1 || args.indexOf('-y') != -1) {
    mode = 'yaml'
} else if (args.indexOf('--json') != -1 || args.indexOf('-j') != -1) {
    mode = 'json'
} else if (args.indexOf('--html') != -1 || args.indexOf('-h') != -1) {
    mode = 'html'
}

switch (mode) {
    case 'help':
        console.log(
            `Usage:
tinyspec [option]

Options:
    --yaml | -y     Generate OpenAPI/Swagger YAML (default)
    --json | -j     Generate OpenAPI/Swagger JSON
    --html | -h     Generate HTML/CSS document
    --help          Display this help
`
        );
        break;
    case 'yaml':
        fs.writeFileSync(path.join(srcDir, TARGET_YAML_FILE), generateYaml());
        break;
    case 'json':
        generateJson(generateYaml());
        break;
    case 'html':
        const needCleanup = !fs.existsSync(TARGET_JSON_FILE);
        generateJson(generateYaml());
        generateHtml(TARGET_JSON_FILE, TARGET_HTML_DIR)
            .then(function () {
                if (needCleanup) {
                    fs.unlinkSync(TARGET_JSON_FILE);
                }
            });
        break;
}

function generateYaml() {
    return [
        fs.readFileSync(path.join(srcDir, 'header.yaml'), 'utf-8'),
        transformEndpoints(fs.readFileSync(path.join(srcDir, 'endpoints.tinyspec'), 'utf-8')),
        transformModels(fs.readFileSync(path.join(srcDir, 'models.tinyspec'), 'utf-8'))
    ].join('');
}

function generateJson(yamlSpec) {
    fs.writeFileSync(
        path.join(srcDir, TARGET_JSON_FILE),
        JSON.stringify(YAML.parse(yamlSpec), null, '  ')
    );
}

function generateHtml(json, target) {
    return bootprint
        .load(bootprintOpenapi)
        .build(json, target)
        .generate()
        .then(console.log);
}