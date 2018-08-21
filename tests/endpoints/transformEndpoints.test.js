const fs = require('fs');
const _ = require('lodash');
const transformEndpoints = require('../../lib/transformEndpoints');

const tests = [
  'Basic',
  'Complex',
  'Different code styles',
  'CRUDL basic',
  'CRUDL custom models',
  'CRUDL override',
];

describe('Endpoints to OpenAPI paths', () => {
  _.forEach(tests, (name) => {
    const key = _.camelCase(name);
    const source = fs.readFileSync(`${__dirname}/sources/${key}.endpoints.tinyspec`, { encoding: 'utf-8' });
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const expectation = require(`${__dirname}/expectations/${key}.paths.json`);

    it(name, () => {
      expect(transformEndpoints(source)).toEqual(expectation);
    });
  });

  it('Invalid definition', () => {
    const source = fs.readFileSync(`${__dirname}/sources/invalidDefinition.endpoints.tinyspec`, { encoding: 'utf-8' });

    expect(() => transformEndpoints(source)).toThrowError('Invalid definition: `Invalid definition`');
  });
});
