const YAML = require('yamljs');
const _ = require('lodash');
const lodashInflection = require('lodash-inflection');
const fetchProps = require('./fetchProps.js');

_.mixin(lodashInflection);

const RE_CRUDL = /^.*?\$[A-Z]+.*/gm;

module.exports = function (text) {
    return parseToYaml(
        text.replace(RE_CRUDL, handleCrudl)
    );
};

function getCrudlMembers(path, keyName, keyNamePlural, entity, entityPlural, modelName, prefix = '', group = '') {
    return {
        'C': `
    // **Create** new ${entity}
    ${prefix}POST ${path}${group} {${keyName}:${modelName}}
        => {success:boolean, id:i}
`,
        'R': `
    // **Retrieve** particular ${entity}
    ${prefix}GET ${path}/:id${group}
        => {${keyName}:${modelName}}
`,
        'U': `
    // **Update** particular ${entity}
    ${prefix}PATCH ${path}/:id${group} {${keyName}:${modelName}}
        => {success:boolean}
`,
        'D': `
    // **Delete** particular ${entity}
    ${prefix}DELETE ${path}/:id${group}
        => {success:boolean}
`,
        'L': `
    // **List** available ${entityPlural}
    ${prefix}GET ${path}${group}
        => {${keyNamePlural}:${modelName}[]}
`
    }
}

function handleCrudl(line) {
    const match = line.match(/\s*(@\w+ )\$([A-Z]+) ([\/\w_:]+)( \([\w_]+\))?\s?([\w:]+)?/);

    if (!match) {
        throw new Error('Wrong CRUDL format: "' + line + '"');
    }

    const prefix = match[1];

    let actions = match[2];
    if (actions.match('L')) {
        // We need to have `L` in the beginning to keep consistent YAML tree order.
        actions = 'L' + actions.replace('L', '');
    }

    const path = match[3];
    const group = match[4] || '';
    const keyAndModelOverrides = match[5] ? match[5].split(':') : [];
    const keyNamePlural = keyAndModelOverrides.length === 2
        ? _.pluralize(keyAndModelOverrides[0])
        : _.last(path.split('/'));
    const keyName = _.singularize(keyNamePlural);
    const modelName = keyAndModelOverrides[1] || keyAndModelOverrides[0] || _.upperFirst(_.camelCase(keyName));
    const entity = match[5]
        ? `*${keyName}* (of type [\`${modelName}\`](#/definitions/${modelName}))`
        : `[\`${modelName}\`](#/definitions/${modelName})`;
    const entityPlural = match[5]
        ? `*${keyNamePlural}* (of type [\`${modelName}\`](#/definitions/${modelName}))`
        : `[\`${modelName}\`](#/definitions/${modelName}) records`;
    const members = getCrudlMembers(path, keyName, keyNamePlural, entity, entityPlural, modelName, prefix, group);

    return actions.split('').map((actionLetter) => members[actionLetter]).join('\n');
}

function parseToYaml (text) {
    const data = {paths: {}};
    const endpoints = data.paths;
    let currentTag = null;
    let currentDescription = [];
    let currentResponse = null;

    text.split(/\n+/).forEach(function (line) {
        if (_.endsWith(line, ':')) {
            currentTag = _.trim(line, ':');
            return;
        }

        if (line.match(/\/\//)) {
            currentDescription.push(line.match(/\/\/\s*(.*)/)[1]);
            return;
        }

        if (line.match(/=>/)) {
            injectResponse(currentResponse, line.match(/=>\s*(.*)/)[1]);
            return;
        }

        const match = line.match(/\s*(@\w+ )?([A-Z]+) ([\/\w_:]+)( \([\w_]+\))?(\?.+)?( (\{.+\}))?/);

        if (!match) {
            return;
        }

        const authMethod = match[1] && match[1].replace(/[@\s]/g, '');
        const method = match[2];
        let path = match[3];
        const group = match[4] || '';
        const pathParams = match[3].match(/:.+?(\/|$)/g);
        const queryParams = match[5] && match[5].replace('?', '').split('&');
        const bodyParams = match[7] && match[7];
        let parameters = [];
        const signature = method + ' ' + path;
        const operationId = signature.replace(' /', '_').replace(/\//g, '-');
        const summary = currentDescription.length ? currentDescription[0] : signature;
        const description = currentDescription.length > 1 ? currentDescription.slice(1).join('\n') : summary;
        currentDescription = [];
        const def = {
            summary,
            description,
            operationId,
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
                    {
                        in: 'query'
                    }
                ));
            });
        }

        if (bodyParams) {
            parameters.push({
                name: 'params',
                required: true,
                schema: fetchProps(bodyParams),
                in: 'body'
            });
        }

        if (parameters.length) {
            def.parameters = parameters;
        }

        path = `${path}${group}`;

        if (!endpoints[path]) {
            endpoints[path] = {};
        }

        endpoints[path][method.toLowerCase()] = def;
    });

    function injectResponse(container, response) {
        const res = fetchProps(response);
        container.schema = res.schema || _.pick(res, ['type', 'format', 'items', 'properties']);
    }

    return YAML.stringify(data, Infinity, 2);
};
