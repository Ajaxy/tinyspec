const YAML = require('yamljs');
const fetchProps = require('./fetchProps.js');

module.exports = function (text) {
    const data = {definitions: {}};
    const models = data.definitions;

    text.split(/\n/).forEach(function (line) {
        const pair = line.split(' {');
        const modelName = pair[0];
        const props = '{' + pair[1];

        models[modelName] = fetchProps(props);
        // models[modelName]['x-stoplight'] = {
        //     id: modelName,
        //     name: modelName,
        //     public: true
        // }
    });

    return YAML.stringify(data, Infinity, 2);
};