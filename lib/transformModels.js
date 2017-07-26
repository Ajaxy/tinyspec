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
        const modelName = pair[0];
        let props = '{' + pair[1];

        const isVirtual = _.startsWith(modelName, '_');
        const isJoin = _.endsWith(modelName, 'Join');

        if (!isVirtual) {
            if (!isJoin) {
                props = props.replace('{', '{id:i,');
            }

            props = props.replace('}', ', created_at:d, updated_at:d}');
        }

        models[modelName] = fetchProps(props);
    });

    return YAML.stringify(data, Infinity, 2);
};