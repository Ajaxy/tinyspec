#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');
const { argv } = require('yargs');

const parseProject = require('./lib/parseProject');

const TARGET_YAML_FILE = 'openapi.yaml';
const TARGET_JSON_FILE = 'openapi.json';

const srcDir = argv.src || argv.s || process.cwd();
const outputDir = argv.output || argv.o || '.';

let mode = 'help';

if (argv.yaml || argv.y) {
  mode = 'yaml';
} else if (argv.json || argv.j) {
  mode = 'json';
}
switch (mode) {
  case 'yaml': {
    fs.writeFileSync(path.join(srcDir, outputDir, TARGET_YAML_FILE), parseProject(srcDir));
    break;
  }
  case 'json': {
    generateJson(parseProject(srcDir), path.join(srcDir, outputDir, TARGET_JSON_FILE));
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
    --src | -s      Path to sources directory, defaults to current directory
    --output | -o   Path to place generated files
    --add-nulls     Include \`null\` as possible value for non-required fields
    --help          Display this help
`,
    );
    break;
  }
}

function generateJson(yamlSpec, target) {
  fs.writeFileSync(
    target,
    JSON.stringify(YAML.parse(yamlSpec), null, '  '),
  );
}
