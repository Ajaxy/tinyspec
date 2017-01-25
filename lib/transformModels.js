var YAML = require('yamljs');
var fetchProps = require('./fetchProps.js');

module.exports = function (text) {
    var data = {definitions: {}};
    var models = data.definitions;

    text.split(/\n/).forEach(function (line) {
        var pair = line.split(' {');
        var modelName = pair[0];
        var props = '{' + pair[1];

        models[modelName] = fetchProps(props);
        // models[modelName]['x-stoplight'] = {
        //     id: modelName,
        //     name: modelName,
        //     public: true
        // }
    });

    return YAML.stringify(data, Infinity, 2);
};