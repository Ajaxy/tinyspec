const _ = require('lodash');

const RE_MODEL = /^[A-Z<_]/

const PROP_TYPES = {
    i: 'integer',
    f: 'float', // float
    s: 'string',
    b: 'boolean',
    d: 'datetime', // datetime
    t: 'text', // text
    j: 'json', // json
    r: 'integer' // reference
};

function fetchObject(props) {
    const properties = {};
    const required = [];

    props.forEach(function (prop) {
        const res = fetchSingleOrCollection(prop);

        properties[res.name] = res.schema || _.pick(res, ['type', 'items']);

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

function fetchSingleOrCollection(prop) {
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
    const propType = propSymbol ? (PROP_TYPES[propSymbol] || propSymbol) : 'string';

    const value = isRef ? {
        schema: {
            $ref: '#/definitions/' + propType
        }
    } : {
        type: propType
    };

    const extended = !isCollection ? value : {
        type: 'array',
        items: value.schema || value
    };

    return Object.assign({
        name: propName,
        required: isRequired
    }, extended);
}

module.exports = function (props, options) {
    if (_.startsWith(props, '{')) {
        props = _.trim(props, '{}').split(/,\s?|&/);

        if (options && options.noSchema) {
            return props.map(fetchSingleOrCollection);
        }

        return fetchObject(props);
    }

    return fetchSingleOrCollection(props);
};