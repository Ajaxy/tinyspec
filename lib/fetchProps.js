var _ = require('lodash');

var PROP_TYPES = {
    i: 'integer',
    f: 'float',
    s: 'string',
    b: 'boolean',
    d: 'integer', // datetime
    j: 'string' // json
};

function fetchObject(props) {
    var properties = {};
    var required = [];

    props.forEach(function (prop) {
        var res = fetchSingleOrCollection(prop);

        properties[res.name] = res.schema || _.pick(res, ['type', 'items']);

        if (res.required) {
            required.push(res.name);
        }
    });

    var schema = {
        type: 'object',
        properties: properties
    };

    if (required.length) {
        schema.required = required;
    }

    return schema;
}

function fetchSingleOrCollection(prop) {
    var propPair = prop.split(/:|=/);

    // Single models don't have names.
    if (propPair[0].match(/^[A-Z]/) && !propPair[1]) {
        propPair = ['', propPair[0]]
    }

    var isRef = propPair[1] && !!propPair[1].match(/^[A-Z]/);
    var isRequired = !propPair[1] || !_.endsWith(propPair[1], '?');
    var isCollection = propPair[1] && _.endsWith(propPair[1].replace('?', ''), '[]');

    var propName = propPair[0];
    var propSymbol = propPair[1] ? propPair[1].replace('[]', '').replace('?', '') : null;
    var propType = propSymbol ? (PROP_TYPES[propSymbol] || propSymbol) : 'string';

    var value = isRef ? {
        schema: {
            $ref: '#/definitions/' + propType
        }
    } : {
        type: propType
    };

    var extended = !isCollection ? value : {
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