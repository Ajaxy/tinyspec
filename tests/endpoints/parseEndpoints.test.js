const fs = require('fs');
const _ = require('lodash');
const parseEndpoints = require('../../lib/parseEndpoints');

const tests = [
  'Basic',
  'Complex',
  'Different code styles',
  'CRUDL basic',
  'CRUDL custom models',
  'CRUDL override',
  'Nested objects',
  'Model in query',
];

describe('Endpoints to OpenAPI paths', () => {
  _.forEach(tests, (name) => {
    const key = _.camelCase(name);
    const source = fs.readFileSync(`${__dirname}/sources/${key}.endpoints.tinyspec`, { encoding: 'utf-8' });
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const expectation = require(`${__dirname}/expectations/${key}.paths.json`);

    it(name, () => {
      expect(parseEndpoints(source)).toEqual(expectation);
    });
  });

  it('Invalid definition', () => {
    const source = fs.readFileSync(`${__dirname}/sources/invalidDefinition.endpoints.tinyspec`, { encoding: 'utf-8' });

    expect(() => parseEndpoints(source)).toThrowError('Invalid definition: `Invalid definition`');
  });
});
