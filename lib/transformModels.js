const YAML = require('yamljs');
const _ = require('lodash');
const fetchProps = require('./fetchProps.js');

module.exports = function (text) {
    const data = {definitions: {}};
    const models = data.definitions;

    text.split(/\n/).forEach(function (line) {
        const pair = line.split(' {');
        const modelName = pair[0];
        let props = '{' + pair[1];
        if (!_.endsWith(modelName, 'Join')) {
            props = props.replace('{', '{id:i,');
        }
        props = props.replace('}', ', created_at:d, updated_at:d}');

        models[modelName] = fetchProps(props);
        // models[modelName]['x-stoplight'] = {
        //     id: modelName,
        //     name: modelName,
        //     public: true
        // }
    });

    return YAML.stringify(data, Infinity, 2);
};