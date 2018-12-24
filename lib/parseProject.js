const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const glob = require('glob');
const YAML = require('yamljs');
const { argv } = require('yargs');

const parseEndpoints = require('./parseEndpoints');
const parseModels = require('./parseModels');

function parseProject(srcDir) {
  const pattern = path.join(srcDir, '**', '@(*models.tinyspec|*endpoints.tinyspec|header.yaml)');
  const filePaths = glob.sync(pattern, { ignore: path.join(srcDir, '**/node_modules/**') });
  const byType = _.groupBy(filePaths, filePath => filePath.match(/\w+\.\w+$/)[0]);
  const header = fs.readFileSync(byType['header.yaml'][0], 'utf-8');
  const models = byType['models.tinyspec'].map(filePath => fs.readFileSync(filePath)).join('\n\n');
  const endpoints = byType['endpoints.tinyspec'].map(filePath => fs.readFileSync(filePath)).join('\n\n');

  const { addNulls } = argv;

  const pathsYaml = YAML.stringify(parseEndpoints(endpoints), Infinity, 2);
  const definitionsYaml = YAML.stringify(parseModels(models, { addNulls }), Infinity, 2);

  return [header, pathsYaml, definitionsYaml].join('\n');
}

module.exports = parseProject;
