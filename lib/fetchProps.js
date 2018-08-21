const _ = require('lodash');

const DEFAULT_TYPE = 'string';

const PROP_TYPES = {
  i: 'integer',
  f: 'float',
  s: 'string',
  b: 'boolean',
  d: 'datetime',
  t: 'text',
  j: 'json',
  o: 'object',
};

const SWAGGER_FORMATS = {
  float: ['number'],
  datetime: ['string', 'date-time'],
  text: ['string'],
  json: ['string'],
};

function parsePropsString(propsString, options = {}) {
  if (/^!?{/.test(propsString)) {
    const trimmedPropsString = propsString.replace(/^(\s*)?!?{?(\s*)?/, '').replace(/(\s*)?}?(\s*)?$/, '');

    if (!trimmedPropsString || !trimmedPropsString.length) {
      return {};
    }

    const props = splitProps(trimmedPropsString);

    if (options.noSchema) {
      return props.map(prop => parseProp(prop, options));
    }

    const schema = fetchObjectSchema(props, options);

    if (_.startsWith(propsString, '!')) {
      schema.additionalProperties = false;
    }

    return schema;
  }

  return parseProp(propsString, options);
}

function splitProps(propsString) {
  const RE_DELIMITER = /\s*[,;&]\s*/;
  const PLACEHOLDER = '%';

  if (!propsString.includes('{')) {
    return _.compact(propsString.split(RE_DELIMITER));
  }

  const bracesStack = [];
  let cleanString = propsString;
  const nestedObjects = [];

  propsString.split('').forEach((char, i) => {
    if (char === '{') {
      bracesStack.push(i);
    } else if (char === '}') {
      if (bracesStack.length === 1) {
        const nestedObject = propsString.slice(bracesStack, i + 1);
        cleanString = cleanString.replace(nestedObject, PLACEHOLDER);
        nestedObjects.push(nestedObject);
      }

      bracesStack.pop();
    }
  });

  return _.compact(cleanString.split(RE_DELIMITER))
    .map(cleanProp => (
      cleanProp.includes(PLACEHOLDER)
        ? cleanProp.replace(PLACEHOLDER, nestedObjects.shift())
        : cleanProp));
}

function fetchObjectSchema(props, options) {
  const properties = {};
  const required = [];

  props.forEach((prop) => {
    const res = parseProp(prop, options);

    properties[res.name] = _.pick(res, ['$ref', 'enum', 'type', 'anyOf', 'format', 'items', 'properties', 'required']);

    if (res.isRequired) {
      required.push(res.name);
    }
  });

  const schema = {
    type: 'object',
    properties,
  };

  if (required.length) {
    schema.required = required;
  }

  return schema;
}

function parseProp(prop, options = {}) {
  const propPair = prop.split(/\s?[:=]\s?(.*)?/, 2);
  const isRequired = !(_.endsWith(propPair[0], '?') || (propPair[1] && _.endsWith(propPair[1], '?')));

  if (!isRequired) {
    propPair[0] = propPair[0].replace('?', '');
    propPair[1] = propPair[1] && propPair[1].replace('?', '');
  }

  const {
    isRef, isEnum, isNestedObject, isCollection, isValid, type: extractedType, format,
  } = parseType(propPair[1] || propPair[0]);

  if (propPair[1] && !isValid) {
    throw new Error(`Definition \`${prop}\` is invalid`);
  }

  const isTypeOnly = !propPair[1] && (isRef || isEnum);
  const isNameOnly = !propPair[1] && !isTypeOnly;

  const name = isTypeOnly ? '' : propPair[0];
  const type = isNameOnly ? DEFAULT_TYPE : extractedType;

  let def;

  if (isRef) {
    def = { $ref: `#/definitions/${type}` };
  } else if (isEnum) {
    def = { enum: type };
  } else if (isNestedObject) {
    def = parsePropsString(type);
  } else {
    def = { type };

    if (!isNameOnly && format) {
      def.format = format;
    }
  }

  if (isCollection) {
    def = {
      type: 'array',
      items: def,
    };
  }

  if (!isRequired && options.addNulls) {
    if (isRef || isEnum || isCollection) {
      def = {
        anyOf: [def, { type: 'null' }],
      };
    } else {
      def.type = [def.type, 'null'];
    }
  }

  return Object.assign({ name, isRequired }, def);
}

function parseType(typeDef) {
  let type = typeDef.replace('[]', '');
  let format;

  const isRef = /^[A-Z]\w+$/.test(type);
  const isSymbol = Object.keys(PROP_TYPES).includes(type);
  const isType = _.values(PROP_TYPES).includes(type);
  const isEnum = /^\(/.test(type);
  const isNestedObject = /^{/.test(type);
  const isCollection = _.endsWith(typeDef, '[]');
  const isValid = isRef || isSymbol || isType || isEnum || isNestedObject;

  if (!isValid) {
    type = null;
  } else if (isSymbol) {
    type = PROP_TYPES[type];
  } else if (isEnum) {
    type = _.trim(type, '()').split('|').map(parseValue);
  }

  if (SWAGGER_FORMATS[type]) {
    [type, format] = SWAGGER_FORMATS[type];
  }

  return {
    isRef, isSymbol, isType, isEnum, isNestedObject, isCollection, isValid, type, format,
  };
}

function parseValue(value) {
  let parsed = _.trim(value);

  try {
    parsed = JSON.parse(value);
  } catch (err) {
    // Continue.
  }

  return parsed;
}

module.exports = parsePropsString;
