const _ = require('lodash');
const { argv } = require('yargs');

const RE_MODEL = /^[A-Z<_]/;

const PROP_TYPES = {
    i: 'integer',
    f: 'number',
    s: 'string',
    b: 'boolean',
    d: 'datetime',
    t: 'text',
    j: 'json',
    r: 'integer',
    h: 'hash'
};

const SWAGGER_FORMATS = {
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
    let propPair = prop.split(/:|=/);

    // Single models don't have names.
    if (propPair[0].match(RE_MODEL) && !propPair[1]) {
        propPair = ['', propPair[0]]
    }

    const isRef = propPair[1] && !!propPair[1].match(RE_MODEL);
    const isRequired = !propPair[1] || !_.endsWith(propPair[1], '?');
    const isCollection = propPair[1] && _.endsWith(propPair[1].replace('?', ''), '[]');

    const propName = propPair[0];
    const propSymbol = propPair[1] ? propPair[1].replace('[]', '').replace('?', '') : null;
    let propType = propSymbol ? (PROP_TYPES[propSymbol] || propSymbol) : 'string';
    let propFormat;

    if (SWAGGER_FORMATS[propType]) {
        propFormat = SWAGGER_FORMATS[propType][1];
        propType = SWAGGER_FORMATS[propType][0];
    }

    const value = isRef ? {
        $ref: '#/definitions/' + propType
    } : {
        type: propType
    };

    if (propFormat) {
        value.format = propFormat;
    }

    const extended = !isCollection ? value : {
        type: 'array',
        items: value
    };

    if (argv.addNulls && !isRequired && !options.noNull) {
        if (isRef) {
            value.anyOf = [{
                $ref: value.$ref
            }, {
                type: 'null'
            }];
            delete value.$ref;
        } else {
            value.type = [value.type, 'null'];
        }
    }

    return Object.assign({
        name: propName,
        required: isRequired
    }, extended);
}

module.exports = function (props, options = {}) {
    if (_.startsWith(props, '{')) {
        props = _.trim(props, '{}');

        if (!props || !props.length) {
            return {};
        }

        props = props.split(/,\s?|&/);

        if (options.noSchema) {
            return props.map((prop) => fetchSingleOrCollection(prop, options));
        }

        return fetchObject(props, options);
    }

    return fetchSingleOrCollection(props, options);
};