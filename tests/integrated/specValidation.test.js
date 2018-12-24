const SwaggerParser = require('swagger-parser');
const YAML = require('yamljs');
const parseProject = require('../../lib/parseProject');

describe('Swagger spec validation', () => {
  it('Generate demo project YAML and validate it with official Swagger validator', () => {
    const yaml = parseProject(__dirname);
    const spec = YAML.parse(yaml);

    return SwaggerParser.validate(spec);
  });
});
