const YAML = require('yamljs');
const _ = require('lodash');
const fetchProps = require('./fetchProps.js');
const { argv } = require('yargs');

const DEFAULT_DEFINITION = '{}';

module.exports = function (text) {
    const data = { definitions: {} };
    const models = data.definitions;

    const modelDefs = text
        .replace(/[{(](.|[\r\n])*?[})]$/gm, (propsDef) => propsDef.replace(/\s+/g, ' '))
        .split(/[\r\n]+/);

    modelDefs.forEach(function (line) {
        line = _.trim(line);

        if (!line.length) {
            return true;
        }

        const match = line.match(/^([A-Z]\w*)(\s*<\s*([A-Z][A-Za-z]*))?\s*(.*)$/);
        const modelName = match[1];
        const definition = match[4] || DEFAULT_DEFINITION;
        const isObject = /{.*}/.test(definition);
        const isEnum = /(.*)/.test(definition);

        if (isObject) {
            const parentModelName = match[3];

            if (parentModelName && !models[parentModelName]) {
                throw new Error(`${modelName} < ${parentModelName}: parent model not found`);
            }

            models[modelName] = parseObject(modelName, definition, models[parentModelName]);
        } else if (isEnum) {
            models[modelName] = _.pick(fetchProps(definition), ['enum']);
        } else {
            throw new Error(`Wrong definition: ${line}`);
        }
    });

    return YAML.stringify(data, Infinity, 2);
};

function parseObject(modelName, props, parentModel) {
    let fetched = fetchProps(props);

    if (parentModel) {
        fetched = _.mergeWith({}, parentModel, fetched, (objValue, srcValue) => {
            return _.isArray(objValue) ? objValue.concat(srcValue) : undefined;
        });

        const { properties, required } = fetched;

        const fieldsToRemove = _.chain(properties)
            .keys()
            .filter((name) => _.startsWith(name, '-'))
            .map((name) => [name, name.substring(1)])
            .flatten()
            .value();

        fetched.properties = _.omit(properties, fieldsToRemove);

        const newRequired = _.without(required, ...fieldsToRemove);
        if (newRequired.length) {
            fetched.required = newRequired;
        } else {
            delete fetched.required;
        }
    }

    return fetched;
}
