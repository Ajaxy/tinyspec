var YAML = require('yamljs');
var pick = require('lodash.pick');
var fetchProps = require('./fetchProps.js');

module.exports = function (text) {
    var data = {paths: {}};
    var endpoints = data.paths;
    var currentResponse = null;

    text.split(/\n+/).forEach(function (line) {
        var match = line.match(/(public )?([A-Z]+) ([\/\w_\{\}]+)(\?.+)?( (\{.+\}))?/);

        if (!match) {
            var response = line.split('=> ')[1];

            if (response) {
                injectResponse(currentResponse, response);
            }

            return;
        }

        var isPublic = match[1];
        var method = match[2];
        var path = match[3];
        var pathParams = match[3].match(/\{.+?\}/g);
        var queryParams = match[4] && match[4].replace('?', '').split('%');
        var bodyParams = match[6] && match[6];
        var parameters = [];
        var summary = method + ' ' + path;
        var operationId = summary.replace(' /', '_').replace(/\//g, '-');
        var def = {
            summary: summary,
            operationId: operationId,
            responses: {
                '200': {
                    description: '',
                    schema: {
                        type: 'object',
                        required: ['success'],
                        properties: {
                            success: {
                                type: 'boolean'
                            }
                        }
                    }
                }
            }
            // 'x-stoplight': {
            //     id: operationId,
            //     public: true
            // }
        };

        if (!isPublic) {
            def.security = [{token: []}];
        }

        currentResponse = def.responses['200'];

        if (pathParams) {
            pathParams.forEach(function (param) {
                parameters.push(Object.assign(
                    fetchProps(param, {noSchema: true})[0],
                    {
                        in: 'path',
                        required: true
                    })
                );
            });
        }

        if (queryParams) {
            queryParams.forEach(function (param) {
                parameters.push(Object.assign(
                    fetchProps('{' + param + '}', {noSchema: true})[0],
                    {in: 'query'})
                );
            });
        }

        if (bodyParams) {
            parameters = parameters.concat(fetchProps(bodyParams, {noSchema: true}).map(function (param) {
                param.in = 'body';
                return param;
            }));
        }

        if (parameters.length) {
            def.parameters = parameters;
        }

        if (!endpoints[path]) {
            endpoints[path] = {};
        }

        endpoints[path][method.toLowerCase()] = def;
    });

    function injectResponse(container, response) {
        var res = fetchProps(response);
        container.schema = res.schema || pick(res, ['type', 'items', 'properties']);
    }

    return YAML.stringify(data, Infinity, 2);
};
