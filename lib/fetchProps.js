const _ = require('lodash');
const { argv } = require('yargs');

const RE_MODEL = /^[A-Z<_]/;

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

function fetchSingleOrCollection(prop, options = {}) {
    let propPair = prop.split(/\s?[:=]\s?/);

    // Single models don't have names.
    if (propPair[0].match(RE_MODEL) && !propPair[1]) {
        propPair = ['', propPair[0]];
    }

    const isRef = propPair[1] && !!propPair[1].match(RE_MODEL);
    const isOptional = _.endsWith(propPair[0], '?') || (propPair[1] && _.endsWith(propPair[1], '?'));
    const isRequired = !isOptional;
    const isCollection = propPair[1] && _.endsWith(propPair[1].replace('?', ''), '[]');

    const propName = propPair[0].replace('?', '');
    const propSymbol = propPair[1] ? propPair[1].replace('[]', '').replace('?', '') : null;
    let propType = propSymbol ? (PROP_TYPES[propSymbol] || propSymbol) : 'string';
    let propFormat;

    if (SWAGGER_FORMATS[propType]) {
        propFormat = SWAGGER_FORMATS[propType][1];
        propType = SWAGGER_FORMATS[propType][0];
    }

    let value = isRef ? {
        $ref: '#/definitions/' + propType
    } : {
        type: propType
    };

    if (propFormat) {
        value.format = propFormat;
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
        name: propName,
        required: isRequired
    }, value);
}

module.exports = function (propsString, options = {}) {
    if (/^!?{/.test(propsString)) {
        let props = _.trim(propsString, '!{}');

        if (!props || !props.length) {
            return {};
        }

        props = props.split(/\s?[,;&]\s?/);

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
