const YAML = require('yamljs');
const _ = require('lodash');
const fetchProps = require('./fetchProps.js');

module.exports = function (text) {
    const data = {paths: {}};
    const endpoints = data.paths;
    let currentTag = null;
    let currentDescription = null;
    let currentResponse = null;

    text.split(/\n+/).forEach(function (line) {
        if (_.endsWith(line, ':')) {
            currentTag = _.trim(line, ':');
            return;
        }

        if (line.match(/\/\//)) {
            currentDescription = line.match(/\/\/\s*(.*)/)[1];
            return;
        }

        if (line.match(/=>/)) {
            injectResponse(currentResponse, line.match(/=>\s*(.*)/)[1]);
            return;
        }

        const match = line.match(/\s*(@\w+ )?([A-Z]+) ([\/\w_:]+)(\?.+)?( (\{.+\}))?/);

        if (!match) {
            return;
        }

        const authMethod = match[1] && match[1].replace(/[@\s]/g, '');
        const method = match[2];
        let path = match[3];
        const pathParams = match[3].match(/:.+?(\/|$)/g);
        const queryParams = match[4] && match[4].replace('?', '').split('&');
        const bodyParams = match[6] && match[6];
        let parameters = [];
        const summary = method + ' ' + path;
        const operationId = summary.replace(' /', '_').replace(/\//g, '-');
        const description = currentDescription;
        currentDescription = null;
        const def = {
            summary: description || summary,
            description: description || summary,
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

        if (currentTag) {
            def.tags = [currentTag];
        }

        if (authMethod) {
            def.security = [{}];
            def.security[0][authMethod] = [];
        }

        currentResponse = def.responses['200'];

        if (pathParams) {
            pathParams.forEach(function (paramMatch) {
                const param = '{' + _.trim(paramMatch, ':/') + '}';

                path = path.replace(_.trim(paramMatch, '/'), param);
                def.operationId = def.operationId.replace(paramMatch.replace('/', ''), param);

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

                if (param.type) {
                    param.schema = {type: param.type};
                    delete param.type;
                }

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
        const res = fetchProps(response);
        container.schema = res.schema || _.pick(res, ['type', 'items', 'properties']);
    }

    return YAML.stringify(data, Infinity, 2);
};
