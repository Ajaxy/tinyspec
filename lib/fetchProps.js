const _ = require('lodash');
const { argv } = require('yargs');

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
    h: 'hash'
};

const SWAGGER_FORMATS = {
    float: ['number'],
    datetime: ['string', 'date-time'],
    text: ['string'],
    json: ['string'],
    hash: ['object']
};

function fetchObjectSchema(props, options) {
    const properties = {};
    const required = [];

    props.forEach(function (prop) {
        const res = parseProp(prop, options);

        properties[res.name] = _.pick(res, ['$ref', 'enum', 'type', 'anyOf', 'format', 'items']);

        if (res.required) {
            required.push(res.name);
        }
    });

    const schema = {
        type: 'object',
        properties: properties
    };

    if (required.length) {
        schema.required = required;
    }

    return schema;
}

function parseType(typeDef) {
    let type = typeDef.replace('[]', '');
    let format;

    const isRef = /^[A-Z]\w+$/.test(type);
    const isSymbol = Object.keys(PROP_TYPES).includes(type);
    const isType = Object.values(PROP_TYPES).includes(type);
    const isEnum = /^\(/.test(type);
    const isCollection = _.endsWith(typeDef, '[]');
    const isValid = isRef || isSymbol || isType || isEnum;

    if (!isValid) {
        type = null;
    } else if (isSymbol) {
        type = PROP_TYPES[type];
    } else if (isEnum) {
        type = _.trim(type, '()').split('|').map(parseValue);
    }

    if (SWAGGER_FORMATS[type]) {
        format = SWAGGER_FORMATS[type][1];
        type = SWAGGER_FORMATS[type][0];
    }

    return { isRef, isSymbol, isType, isEnum, isCollection, isValid, type, format };
}

function parseProp(prop, options = {}) {
    const propPair = prop.split(/\s?[:=]\s?/);
    const isRequired = !(_.endsWith(propPair[0], '?') || propPair[1] && _.endsWith(propPair[1], '?'));

    if (!isRequired) {
        propPair[0] = propPair[0].replace('?', '');
        propPair[1] = propPair[1] && propPair[1].replace('?', '');
    }

    const { isRef, isEnum, isCollection, isValid, type: extractedType, format } = parseType(propPair[1] || propPair[0]);

    if (propPair[1] && !isValid) {
        throw new Error(`Definition \`${prop}\` is invalid`);
    }

    const isTypeOnly = !propPair[1] && (isRef || isEnum);
    const isNameOnly = !propPair[1] && !isTypeOnly;

    const name = isTypeOnly ? '' : propPair[0];
    const type = isNameOnly ? DEFAULT_TYPE : extractedType;

    let value;

    if (isRef) {
        value = { $ref: '#/definitions/' + type };
    } else if (isEnum) {
        value = { enum: type };
    } else {
        value = { type };

        if (format) {
            value.format = format;
        }
    }

    if (isCollection) {
        value = {
            type: 'array',
            items: value
        };
    }

    if (argv.addNulls && !isRequired && !options.noNull) {
        if (isRef || isCollection) {
            value = {
                anyOf: [value, { type: 'null' }]
            };
        } else {
            value.type = [value.type, 'null'];
        }
    }

    return Object.assign({
        name,
        required: isRequired
    }, value);
}

module.exports = function (propsString, options = {}) {
    if (/^!?{/.test(propsString)) {
        let props = _.trim(propsString, '!{} ');

        if (!props || !props.length) {
            return {};
        }

        props = _.compact(props.split(/\s*[,;&]\s*/));

        if (options.noSchema) {
            return props.map((prop) => parseProp(prop, options));
        }

        const schema = fetchObjectSchema(props, options);

        if (_.startsWith(propsString, '!')) {
            schema.additionalProperties = false;
        }

        return schema;
    }

    return parseProp(propsString, options);
};

function parseValue(value) {
    let parsed = value;

    try {
        parsed = JSON.parse(value);
    } catch (err) {
    }

    return parsed;
}
