const fs = require('fs');
const _ = require('lodash');
const transformModels = require('../../lib/transformModels');

const tests = [
  'Primitive types',
  'Array types',
  'Optional props',
  'References',
  'Enum',
  'References to enum',
  'Array references',
  'No extra props',
  'Inheritance',
  'Comments',
  'Multiline',
  'Different code styles',
];

describe('Models to OpenAPI definitions', () => {
  _.forEach(tests, (name) => {
    const key = _.camelCase(name);
    const source = fs.readFileSync(`${__dirname}/sources/${key}.models.tinyspec`, { encoding: 'utf-8' });
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const expectation = require(`${__dirname}/expectations/${key}.definitions.json`);

    it(name, () => {
      expect(transformModels(source)).toEqual(expectation);
    });
  });

  it('Optional props with `options.addNulls = true`', () => {
    const source = fs.readFileSync(`${__dirname}/sources/optionalProps.models.tinyspec`, { encoding: 'utf-8' });
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const expectation = require(`${__dirname}/expectations/optionalPropsWithAddNulls.definitions.json`);

    expect(transformModels(source, { addNulls: true })).toEqual(expectation);
  });
});
