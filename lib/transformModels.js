const _ = require('lodash');
const fetchProps = require('./fetchProps.js');

const DEFAULT_DEFINITION = '{}';

function toOpenapi(text, options) {
  const data = { definitions: {} };
  const models = data.definitions;

  const modelDefs = text
    .replace(/\s*#.*/gm, '')
    .replace(/[{(](.|[\r\n])*?[})]$/gm, propsDef => propsDef.replace(/\s+/g, ' '))
    .split(/[\r\n]+/);

  modelDefs.forEach((line) => {
    line = _.trim(line);

    if (!line.length) {
      return true;
    }

    const match = line.match(/^([A-Z]\w*)(\s*<\s*([A-Z]\w*))?\s*(.*)$/);
    const modelName = match[1];
    const definition = match[4] || DEFAULT_DEFINITION;
    const isObject = /{.*}/.test(definition);
    const isEnum = /(.*)/.test(definition);

    if (isObject) {
      const fetched = fetchProps(definition, options);
      const parentModelName = match[3];

      if (!fetched.type) {
        fetched.type = 'object';
      }

      if (parentModelName) {
        if (!models[parentModelName] || !models[parentModelName].properties) {
          throw new Error(`${modelName} < ${parentModelName}: parent model object not found`);
        }

        inherit(fetched, models[parentModelName]);
      }

      models[modelName] = fetched;
    } else if (isEnum) {
      models[modelName] = _.pick(fetchProps(definition), ['enum']);
    } else {
      throw new Error(`Wrong definition: ${line}`);
    }
  });

  return data;
}

function inherit(child, parent) {
  const selfFields = child.properties ? Object.keys(child.properties) : [];
  const removalIndicators = selfFields.filter(name => _.startsWith(name, '-'));
  const removedFields = removalIndicators.map(field => field.substring(1));
  const overriddenFields = _.difference(selfFields, removalIndicators);
  const inheritedFields = _.difference(Object.keys(parent.properties), [...overriddenFields, ...removedFields]);

  child.properties = _.assign(
    {},
    _.pick(parent.properties, inheritedFields),
    _.pick(child.properties, overriddenFields),
  );

  const selfRequired = child.required ? _.difference(child.required, removalIndicators) : [];
  const inheritedRequired = parent.required ? _.intersection(parent.required, inheritedFields) : [];

  if (selfRequired.length || inheritedRequired.length) {
    child.required = _.concat(
      inheritedRequired,
      selfRequired,
    );
  } else {
    delete child.required;
  }
}

module.exports = toOpenapi;
