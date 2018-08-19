#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const _ = require('lodash');
const YAML = require('yamljs');
const { argv } = require('yargs');

let bootprint;
let bootprintOpenapi;

/* eslint-disable global-require, import/no-unresolved */
try {
  bootprint = require('bootprint');
  bootprintOpenapi = require('bootprint-openapi');
} catch (err) {
  // Continue.
}
/* eslint-enable global-require, import/no-unresolved */

const transformEndpoints = require('./lib/transformEndpoints');
const transformModels = require('./lib/transformModels');

const TARGET_YAML_FILE = 'openapi.yaml';
const TARGET_JSON_FILE = 'openapi.json';

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
  case 'yaml': {
    fs.writeFileSync(path.join(srcDir, outputDir, TARGET_YAML_FILE), generateYaml());
    break;
  }
  case 'json': {
    generateJson(generateYaml(), path.join(srcDir, outputDir, TARGET_JSON_FILE));
    break;
  }
  case 'html': {
    if (!bootprint || !bootprintOpenapi) {
      // eslint-disable-next-line global-require
      const { peerDependencies } = require('./package');
      const installCommand = _.map(peerDependencies, (v, k) => `${k}@${v}`).join(' ');

      // eslint-disable-next-line no-console
      console.error(`Please, install peer dependencies first: \`npm install ${installCommand}\``);
      process.exit(1);
    }

    const jsonFilePath = path.join(srcDir, TARGET_JSON_FILE);
    const needCleanup = !fs.existsSync(jsonFilePath);

    generateJson(generateYaml(), jsonFilePath);
    generateHtml(jsonFilePath, outputDir)
      .then(() => {
        if (needCleanup) {
          fs.unlinkSync(jsonFilePath);
        }
      });
    break;
  }
  case 'help':
  default: {
    // eslint-disable-next-line no-console
    console.log(
      `Usage:
tinyspec [options]

Options:
    --yaml | -y     Generate OpenAPI/Swagger YAML
    --json | -j     Generate OpenAPI/Swagger JSON
    --html | -h     Generate HTML/CSS document
    --output | -o    Path to place generated files
    --add-nulls     Include \`null\` as possible value for non-required fields
    --help          Display this help
`,
    );
    break;
  }
}

function generateYaml() {
  const pattern = path.join(srcDir, '**', '@(*models.tinyspec|*endpoints.tinyspec|header.yaml)');
  const filePaths = glob.sync(pattern, { ignore: path.join(srcDir, '**/node_modules/**') });
  const byType = _.groupBy(filePaths, filePath => filePath.match(/\w+\.\w+$/)[0]);
  const header = fs.readFileSync(byType['header.yaml'][0], 'utf-8');
  const models = byType['models.tinyspec'].map(filePath => fs.readFileSync(filePath)).join('\n\n');
  const endpoints = byType['endpoints.tinyspec'].map(filePath => fs.readFileSync(filePath)).join('\n\n');

  const { addNulls } = argv;

  const pathsYaml = YAML.stringify(transformEndpoints(endpoints), Infinity, 2);
  const definitionsYaml = YAML.stringify(transformModels(models, { addNulls }), Infinity, 2);

  return [header, pathsYaml, definitionsYaml].join('\n');
}

function generateJson(yamlSpec, target) {
  fs.writeFileSync(
    target,
    JSON.stringify(YAML.parse(yamlSpec), null, '  '),
  );
}

function generateHtml(json, target) {
  return bootprint
    .load(bootprintOpenapi)
    .merge({
      handlebars: {
        partials: path.join(__dirname, './lib/bootprint_partials'),
      },
    })
    .build(json, target)
    .generate()
    // eslint-disable-next-line no-console
    .then(console.log)
    // eslint-disable-next-line no-console
    .catch(console.error);
}
