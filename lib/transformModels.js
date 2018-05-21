const YAML = require('yamljs');
const _ = require('lodash');
const fetchProps = require('./fetchProps.js');
const { argv } = require('yargs');

module.exports = function (text) {
    const data = {definitions: {}};
    const models = data.definitions;

    text.split(/[\r\n]+/).forEach(function (line) {
        if (!_.trim(line).length) {
            return true;
        }

        const propsStartAt = line.search(/!?{/);
        const model = propsStartAt > 0 ? line.substring(0, propsStartAt) : line;
        const [modelName, parentModelName] = _.trim(model).split(/\s?<\s?/);
        let props = propsStartAt > 0 && _.trim(line.substring(propsStartAt)) || '{}';

        const isPartial = _.startsWith(modelName, '_');
        const isJoin = _.endsWith(modelName, 'Join');

        if (!isPartial && argv.defaultAttrs) {
            if (!isJoin) {
                props = props.replace('{', '{id:i,');
            }

            props = props.replace('}', ', created_at:d, updated_at:d}');
        }

        if (parentModelName) {
            if (!models[parentModelName]) {
                throw new Error(`${modelName}<${parentModelName}: parent model not found`);
            }

            models[modelName] = _.mergeWith({}, models[parentModelName], fetchProps(props), (objValue, srcValue) => {
                return _.isArray(objValue) ? objValue.concat(srcValue) : undefined
            });

            const {properties, required} = models[modelName];

            const fieldsToRemove = _.chain(properties)
                .keys()
                .filter((name) => _.startsWith(name, '-'))
                .map((name) => [name, name.substring(1)])
                .flatten()
                .value();

            models[modelName].properties = _.omit(properties, fieldsToRemove);

            const newRequired = _.without(required, ...fieldsToRemove);
            if (newRequired.length) {
                models[modelName].required = newRequired;
            } else {
                delete models[modelName].required;
            }
        } else {
            models[modelName] = fetchProps(props);
        }
    });

    return YAML.stringify(data, Infinity, 2);
};
