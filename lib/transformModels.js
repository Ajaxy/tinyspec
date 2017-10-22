const YAML = require('yamljs');
const _ = require('lodash');
const fetchProps = require('./fetchProps.js');

module.exports = function (text) {
    const data = {definitions: {}};
    const models = data.definitions;

    text.split(/\n/).forEach(function (line) {
        if (!_.trim(line).length) {
            return true;
        }

        const pair = line.split(' {');
        const [modelName, parentModelName] = pair[0].split('<');
        let props = '{' + pair[1];

        const isPartial = _.startsWith(modelName, '_');
        const isJoin = _.endsWith(modelName, 'Join');

        if (!isPartial) {
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
        } else {
            models[modelName] = fetchProps(props);
        }
    });

    return YAML.stringify(data, Infinity, 2);
};