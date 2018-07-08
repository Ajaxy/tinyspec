const YAML = require('yamljs');
const _ = require('lodash');
const lodashInflection = require('lodash-inflection');
const fetchProps = require('./fetchProps.js');

_.mixin(lodashInflection);

const RE_CRUDL = /^.*?\$[A-Z]+.*/gm;
const DEFAULT_STATUS = 200;
const DEFAULT_RESPONSE = {
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
};

module.exports = function (text) {
    return parseToYaml(
        text.replace(RE_CRUDL, handleCrudl)
    );
};

function getCrudlMembers({
    path, keyName, keyNamePlural, entity, entityPlural, baseModelName, prefix = '', group = '', useSubModels
}) {
    return {
        'C': `
    // **Create** new ${entity}
    ${prefix}POST ${path}${group} {${keyName}: ${baseModelName}${useSubModels ? 'New' : ''}}
        => {success: b, id: i}
`,
        'R': `
    // **Retrieve** particular ${entity}
    ${prefix}GET ${path}/:id${group}
        => {${keyName}: ${baseModelName}}
`,
        'U': `
    // **Update** particular ${entity}
    ${prefix}PATCH ${path}/:id${group} {${keyName}: ${baseModelName}${useSubModels ? 'Update' : ''}}
        => {success: b}
`,
        'D': `
    // **Delete** particular ${entity}
    ${prefix}DELETE ${path}/:id${group}
        => {success: b}
`,
        'L': `
    // **List** available ${entityPlural}
    ${prefix}GET ${path}${group}
        => {${keyNamePlural}: ${baseModelName}[]}
`
    };
}

function handleCrudl(line) {
    const match = line.match(/\s*(@\w+ )?\$([A-Z]+) ([\/\w_:]+)( \([\w_]+\))?\s*{?\s*([\w\s:]+)?\s*}?/);

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
    const keyAndModelOverrides = match[5] ? match[5].split(/\s?:\s?/) : [];
    const keyNamePlural = keyAndModelOverrides.length === 2
        ? _.pluralize(keyAndModelOverrides[0])
        : _.last(path.split('/'));
    const keyName = _.singularize(keyNamePlural);
    const modelName = keyAndModelOverrides[1] || keyAndModelOverrides[0] || `${_.upperFirst(_.camelCase(keyName))}$`;

    const useSubModels = _.endsWith(modelName, '$');
    const baseModelName = useSubModels ? modelName.replace(/\$$/, '') : modelName;

    const entity = `_${keyName}_`;
    const entityPlural = `_${keyNamePlural}_`;
    const members = getCrudlMembers({
        path, keyName, keyNamePlural, entity, entityPlural, baseModelName, prefix, group, useSubModels
    });

    return actions.split('').map((actionLetter) => members[actionLetter]).join('\n');
}

function removeMarkdownLinks(str) {
    return str.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
}

function parseToYaml(text) {
    const data = { paths: {}, tags: [] };
    const endpoints = data.paths;
    let currentTag = null;
    let currentDescription = [];
    let currentResponses = null;

    text.split(/[\r\n]+/).forEach(function (line) {
        if (_.endsWith(line, ':')) {
            currentTag = _.trim(line, ':');

            if (!_.find(data.tags, { name: currentTag })) {
                data.tags.push({ name: currentTag });
            }

            return;
        }

        if (line.match(/\/\//)) {
            currentDescription.push(line.match(/\/\/\s*(.*)/)[1]);
            return;
        }

        if (line.match(/=>/)) {
            addResponse(line.match(/=>\s*(.*)/)[1]);
            return;
        }

        const match = line.match(/\s*(@\w+ )?([A-Z]+) ([\/\w_:]+)( \([\w_]+\))?(\?.+)?( (.+))?/);

        if (!match) {
            return;
        }

        const authMethod = match[1] && match[1].replace(/[@\s]/g, '');
        const method = match[2];
        let path = match[3];
        const group = match[4] || '';
        const pathParams = match[3].match(/:.*?(\/|$)/g);
        const queryParams = match[5] && match[5].replace('?', '').split('&');
        const bodyParams = match[7];
        let parameters = [];
        const signature = `${method} ${path}${group}`;
        const operationId = signature.replace(/[^\w_-]+/g, '--').replace(/[^\w]+$/, '');
        const title = currentDescription.length ? currentDescription[0] : signature;
        const summary = removeMarkdownLinks(title);
        const description = currentDescription.length > 1 ? currentDescription.join('\n') : title;
        currentDescription = [];
        const def = {
            summary,
            description,
            operationId,
            responses: {
                '200': DEFAULT_RESPONSE
            }
        };

        if (currentTag) {
            def.tags = [currentTag];
        }

        if (authMethod) {
            def.security = [{}];
            def.security[0][authMethod] = [];
        }

        currentResponses = def.responses;

        if (pathParams) {
            pathParams.forEach(function (paramMatch) {
                const param = '{' + _.trim(paramMatch, ':/') + '}';

                parameters.push(Object.assign(
                    fetchProps(param, { noSchema: true })[0],
                    {
                        in: 'path',
                        required: true
                    })
                );
            });
        }

        if (queryParams) {
            queryParams.forEach(function (param) {
                const paramDefinition = fetchProps('{' + param + '}', { noSchema: true, noNull: true })[0];

                // Workaround for OpenAPI v2 https://stackoverflow.com/questions/38187187
                if (paramDefinition.$ref) {
                    const modelName = paramDefinition.$ref.split('/')[2];
                    const href = `_${modelName.toLowerCase()}`;

                    paramDefinition.type = 'object';
                    paramDefinition.description = `Schema: [\`${modelName}\`](#${href}) (stringified)`;

                    delete paramDefinition.$ref;
                }

                parameters.push(Object.assign(
                    paramDefinition,
                    {
                        in: 'query'
                    }
                ));
            });
        }

        if (bodyParams) {
            const props = fetchProps(bodyParams);

            parameters.push({
                name: 'body',
                required: true,
                schema: props,
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

    function addResponse(responseDef) {
        const statusMatch = responseDef.match(/^\d{3}/);
        const status = statusMatch ? statusMatch[0] : DEFAULT_STATUS;
        const props = fetchProps(_.trim(responseDef.replace(status, '')));

        currentResponses[String(status)] = {
            description: currentDescription.join('\n'),
            schema: _.pick(props, ['$ref', 'type', 'anyOf', 'format', 'items', 'properties', 'required'])
        };
        currentDescription = [];
    }

    return YAML.stringify(data, Infinity, 2);
}
