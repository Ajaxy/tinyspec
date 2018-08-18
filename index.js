#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const _ = require('lodash');
const YAML = require('yamljs');

let bootprint;
let bootprintOpenapi;

try {
    bootprint = require('bootprint');
    bootprintOpenapi = require('bootprint-openapi');
} catch (err) {
}

const transformEndpoints = require('./lib/transformEndpoints');
const transformModels = require('./lib/transformModels');

const argv = require('yargs').argv;

const TARGET_YAML_FILE = 'swagger.yaml';
const TARGET_JSON_FILE = 'swagger.json';

const srcDir = process.cwd();
const outputDir = argv.output || argv.o || '.';

let mode = 'help';

if (argv.yaml || argv.y) {
    mode = 'yaml';
} else if (argv.json || argv.j) {
    mode = 'json';
} else if (argv.html || argv.h) {
    mode = 'html';
}

switch (mode) {
    case 'help':
        console.log(
            `Usage:
tinyspec [options]

Options:
    --yaml | -y     Generate OpenAPI/Swagger YAML
    --json | -j     Generate OpenAPI/Swagger JSON
    --html | -h     Generate HTML/CSS document
    --output | -o    Path to output generated files
    --add-nulls     Include \`null\` as possible value for non-required fields
    --help          Display this help
`
        );
        break;
    case 'yaml':
        fs.writeFileSync(path.join(srcDir, outputDir, TARGET_YAML_FILE), generateYaml());
        break;
    case 'json':
        generateJson(generateYaml(), path.join(srcDir, outputDir, TARGET_JSON_FILE));
        break;
    case 'html':
        if (!bootprint || !bootprintOpenapi) {
            const { peerDependencies } = require('./package');
            const installCommand = _.map(peerDependencies, (v, k) => `${k}@${v}`).join(' ');

            console.error(`Please, install peer dependencies first: \`npm install ${installCommand}\``);
            process.exit(1);
        }

        const jsonFilePath = path.join(srcDir, TARGET_JSON_FILE);
        const needCleanup = !fs.existsSync(jsonFilePath);

        generateJson(generateYaml(), jsonFilePath);
        generateHtml(jsonFilePath, outputDir)
            .then(function () {
                if (needCleanup) {
                    fs.unlinkSync(jsonFilePath);
                }
            });
        break;
}

function generateYaml() {
    const pattern = path.join(srcDir, '**', '@(*models.tinyspec|*endpoints.tinyspec|header.yaml)');
    const filePaths = glob.sync(pattern, { ignore: path.join(srcDir, '**/node_modules/**') });
    const byType = _.groupBy(filePaths, (filePath) => filePath.match(/\w+\.\w+$/)[0]);
    const header = fs.readFileSync(byType['header.yaml'][0], 'utf-8');
    const models = byType['models.tinyspec'].map((filePath) => fs.readFileSync(filePath)).join('\n\n');
    const endpoints = byType['endpoints.tinyspec'].map((filePath) => fs.readFileSync(filePath)).join('\n\n');

    return [header, transformEndpoints(endpoints), transformModels(models)].join('\n');
}

function generateJson(yamlSpec, target) {
    fs.writeFileSync(
        target,
        JSON.stringify(YAML.parse(yamlSpec), null, '  ')
    );
}

function generateHtml(json, target) {
    return bootprint
        .load(bootprintOpenapi)
        .merge({
            handlebars: {
                partials: path.join(__dirname, './lib/bootprint_partials')
            }
        })
        .build(json, target)
        .generate()
        .then(console.log)
        .catch(console.error);
}
