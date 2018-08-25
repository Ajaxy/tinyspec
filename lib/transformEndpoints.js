const _ = require('lodash');
const lodashInflection = require('lodash-inflection');
const { parsePropsString, parseSingleProp } = require('./parseProps.js');

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
        type: 'boolean',
      },
    },
  },
};

function toOpenapi(text) {
  const data = { paths: {}, tags: [] };
  const endpoints = data.paths;
  let currentTag = null;
  let currentDescription = [];
  let currentResponses = null;

  text = text
    .replace(/\s*#.*/gm, '')
    .replace(RE_CRUDL, handleCrudl);

  text.split(/[\r\n]+/).forEach((line) => {
    line = _.trim(line);

    if (!line.length) {
      return;
    }

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

    const match = line.match(/\s*(@\w+ )?([A-Z]+) ([/\w_:]+)( \([\w_]+\))?(\?[^\s]+)?( (.+))?/);

    if (!match) {
      throw new Error(`Invalid definition: \`${line}\``);
    }

    const authMethod = match[1] && match[1].replace(/[@\s]/g, '');
    const method = match[2];
    let path = match[3];
    const group = match[4] || '';
    const pathParams = match[3].match(/:.*?(\/|$)/g);
    const queryParams = match[5] && match[5].replace('?', '').split('&');
    const bodyParams = match[7];
    const parameters = [];
    const signature = `${method} ${path}${group}`;
    const operationId = signature.replace(/[^\w_-]+/g, '--').replace(/[^\w]+$/, '');
    const title = currentDescription.length ? currentDescription[0] : signature;
    const summary = removeMarkdownLinks(title);
    const description = currentDescription.length > 1 ? currentDescription.join('\n\n') : title;
    currentDescription = [];
    const def = {
      summary,
      description,
      operationId,
      responses: {
        [DEFAULT_STATUS]: DEFAULT_RESPONSE,
      },
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
      pathParams.forEach((paramMatch) => {
        const paramDef = _.pick(parseSingleProp(_.trim(paramMatch, ':/')), ['name', 'type']);

        parameters.push(Object.assign(
          paramDef,
          {
            in: 'path',
            required: true,
          },
        ));
      });
    }

    if (queryParams) {
      queryParams.forEach((param) => {
        const paramDef = parseSingleProp(param);

        // Workaround for OpenAPI v2 https://stackoverflow.com/questions/38187187
        if (paramDef.$ref) {
          const modelName = paramDef.$ref.split('/')[2];
          const href = `_${modelName.toLowerCase()}`;

          paramDef.type = 'string';
          paramDef.description = `Schema: [\`${modelName}\`](#${href}) (stringified)`;

          delete paramDef.$ref;
        }

        const required = paramDef.isRequired || false;
        delete paramDef.isRequired;

        parameters.push(Object.assign(
          paramDef,
          {
            in: 'query',
            required,
          },
        ));
      });
    }

    if (bodyParams) {
      const props = parsePropsString(bodyParams);

      parameters.push({
        name: 'body',
        required: true,
        schema: props,
        in: 'body',
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
    if (currentResponses[DEFAULT_STATUS] === DEFAULT_RESPONSE) {
      delete currentResponses[DEFAULT_STATUS];
    }

    const statusMatch = responseDef.match(/^\d{3}/);
    const status = statusMatch ? statusMatch[0] : DEFAULT_STATUS;
    const props = parsePropsString(_.trim(responseDef.replace(status, '')));

    currentResponses[String(status)] = {
      description: currentDescription.join('\n'),
      schema: _.pick(props, ['$ref', 'enum', 'type', 'anyOf', 'format', 'items', 'properties', 'required']),
    };
    currentDescription = [];
  }

  return data;
}

function handleCrudl(line) {
  const match = line.match(/\s*(@\w+ )?\$([A-Z]+) ([/\w_:]+)( \([\w_]+\))?\s*{?\s*([\w\s:$]+)?\s*}?/);

  if (!match) {
    throw new Error(`Wrong CRUDL format: "${line}"`);
  }

  const prefix = match[1];

  let actions = match[2];
  if (actions.match('L')) {
    // We need to have `L` in the beginning to keep consistent YAML tree order.
    actions = `L${actions.replace('L', '')}`;
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
    path, keyName, keyNamePlural, entity, entityPlural, baseModelName, prefix, group, useSubModels,
  });

  return actions.split('').map(actionLetter => members[actionLetter]).join('\n');
}

function getCrudlMembers({
  path, keyName, keyNamePlural, entity, entityPlural, baseModelName, prefix = '', group = '', useSubModels,
}) {
  return {
    C: `
    // **Create** new ${entity}
    ${prefix}POST ${path}${group} {${keyName}: ${baseModelName}${useSubModels ? 'New' : ''}}
        => 201 {${keyName}: ${baseModelName}}
`,
    R: `
    // **Retrieve** ${entity}
    ${prefix}GET ${path}/:id${group}
        => {${keyName}: ${baseModelName}}
`,
    U: `
    // **Update** ${entity}
    ${prefix}PATCH ${path}/:id${group} {${keyName}: ${baseModelName}${useSubModels ? 'Update' : ''}}
        => {${keyName}: ${baseModelName}}
`,
    D: `
    // **Delete** ${entity}
    ${prefix}DELETE ${path}/:id${group}
        => {success: b}
`,
    L: `
    // **List** ${entityPlural}
    ${prefix}GET ${path}${group}
        => {${keyNamePlural}: ${baseModelName}[]}
`,
  };
}

function removeMarkdownLinks(str) {
  return str.replace(/\[([^\]]+)]\([^)]+\)/g, '$1');
}

module.exports = toOpenapi;
