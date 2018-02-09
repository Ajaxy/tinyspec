#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');
const bootprint = require('bootprint');
const bootprintOpenapi = require('bootprint-openapi');
const transformEndpoints = require('./lib/transformEndpoints');
const transformModels = require('./lib/transformModels');

const argv = require('yargs').argv;

const TARGET_YAML_FILE = 'swagger.yaml';
const TARGET_JSON_FILE = 'swagger.json';
const TARGET_HTML_DIR = './docs';

const srcDir = process.cwd();

let mode = 'help';

if (argv.yaml || argv.y) {
    mode = 'yaml'
} else if (argv.json || argv.j) {
    mode = 'json'
} else if (argv.html || argv.h) {
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
    --no-default-attrs     Do not add \`id\`, \`created_at\` and \`updated_at\` to all models
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
    ].join('\n');
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
        .merge({
            handlebars: {
                partials: path.join(__dirname, './bootprint_partials')
            }
        })
        .build(json, target)
        .generate()
        .then(console.log);
}