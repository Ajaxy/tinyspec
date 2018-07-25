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

function fetchObject(props, options) {
    const properties = {};
    const required = [];

    props.forEach(function (prop) {
        const res = fetchSingleOrCollection(prop, options);

        properties[res.name] = _.pick(res, ['$ref', 'type', 'anyOf', 'format', 'items']);

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
    let format = null;

    const isRef = /^[A-Z]\w+$/.test(type);
    const isSymbol = Object.keys(PROP_TYPES).includes(type);
    const isType = Object.values(PROP_TYPES).includes(type);
    const isCollection = _.endsWith(typeDef, '[]');
    const isValid = isRef || isSymbol || isType;

    if (!isValid) {
        type = DEFAULT_TYPE;
    } else if (isSymbol) {
        type = PROP_TYPES[type];
    }

    if (SWAGGER_FORMATS[type]) {
        format = SWAGGER_FORMATS[type][1];
        type = SWAGGER_FORMATS[type][0];
    }

    return { isRef, isSymbol, isType, isCollection, isValid, type, format };
}

function fetchSingleOrCollection(prop, options = {}) {
    const propPair = prop.split(/\s?[:=]\s?/);
    const isRequired = !(_.endsWith(propPair[0], '?') || propPair[1] && _.endsWith(propPair[1], '?'));

    if (!isRequired) {
        propPair[0] = propPair[0].replace('?', '');
        propPair[1] = propPair[1] && propPair[1].replace('?', '');
    }

    const { isRef, isCollection, isValid, type: extractedType, format } = parseType(propPair[1] || propPair[0]);

    if (propPair[1] && !isValid) {
        throw new Error(`Definition \`${prop}\` is invalid`);
    }

    const isTypeOnly = !propPair[1] && isRef;
    const isNameOnly = !propPair[1] && !isTypeOnly;

    const name = isTypeOnly ? '' : propPair[0];
    const type = isNameOnly ? DEFAULT_TYPE : extractedType;

    let value = isRef ? {
        $ref: '#/definitions/' + type
    } : {
        type
    };

    if (format) {
        value.format = format;
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
            return props.map((prop) => fetchSingleOrCollection(prop, options));
        }

        const schema = fetchObject(props, options);

        if (_.startsWith(propsString, '!')) {
            schema.additionalProperties = false;
        }

        return schema;
    }

    return fetchSingleOrCollection(propsString, options);
};
