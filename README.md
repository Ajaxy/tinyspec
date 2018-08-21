# <img src="docs/logo.png" width="165" title="tinyspec" alt="tinyspec" />
[![NPM version](https://img.shields.io/npm/v/tinyspec.svg)](https://npmjs.com/package/tinyspec)

- [About](#about)
- [Installing](#installing)
- [Quick Start and Demo](#quick-start-and-demo)
- [Tinyspec Syntax](#tinyspec-syntax)
    - [Models Definition](#models-definition)
    - [Endpoints Definition](#endpoints-paths-definition)
    - [API General Information](#api-general-information)
    - [Comments](#comments)
- [Generating Documentation](#generating-documentation)
    - [Using With GitHub Pages](#generating-documentation-for-existing-projects-with-support-of-github-pages)
    - [Using With Asciidoctor](#using-with-asciidoctor)
    - [Tinyspec Cloud](#tinyspec-cloud)
- [OpenAPI version](#openapi-version)
- [Contributing](#contributing)

## About

Tinyspec offers a lightweight and human-readable alternative to the more verbose [OpenAPI/Swagger](https://github.com/OAI/OpenAPI-Specification) format. It relies on the strengths of the OpenAPI format without the need to maintain the single large JSON or YAML file or to use some special software, instead allowing you to keep your API endpoints and models in separate and easy to maintain files.

Possible outputs include a full OpenAPI specification in YAML and JSON formats, or the API documentation in HTML format created with the help of the [bootprint-openapi](https://github.com/bootprint/bootprint-openapi).


## Installing
To use `tinyspec`, install it globally. Use [npm](https://www.npmjs.com/) for it:
```
npm install -g tinyspec
```

## Quick Start and Demo
To generate the API documentation, follow these steps:

1. Create [`models.tinyspec`](examples/models.tinyspec), [`endpoints.tinyspec`](examples/endpoints.tinyspec) and [`header.yaml`](examples/header.yaml) files. You can find more information on how to write these files yourself below.
2. Run `tinyspec -h`.

You documentation is generated! Check out this [**DEMO**](https://ajaxy.github.io/tinyspec) to see how it may look like.

## Tinyspec Syntax
Tinyspec definition is split into 3 different sections. You specify models and endpoints that the API uses in the special tinyspec format and place any extra information in the `header.yaml` file.

### Models Definition
Models (_definitions_) are described in `models.tinyspec` files. You can also split model definitions in multiple `*.models.tinyspec` files and even place them in folders to make the API specification easier to maintain.

The basic model looks like this:
```
MyModel {field1, field2}
```
You can describe any number of models in a single `*.models.tinyspec` file. Fields should be separated by `,` or `;`. By default, all fields are required and accept `string` data values.

#### Data Types
To specify the expected data type, add it after semicolon (`:`). To make fields accept arrays, add brackets (`[]`). For example to define an object:
```
MyModel {field1: b, field2: float[]}
```
You can use the full type name (`string`, `integer`, `boolean`, etc) or a shorthand (`s`, `i`, `b` and so on). Possible values:

Shorthand|Full|OpenAPI type|OpenAPI format|
---------|----|------------|--------------|
`i`| `integer`
`s`| `string`
`b`| `boolean`
`o`| `object`
`f`| `float` | `number`
`d`| `datetime` | `string` | `date-time`
`t`| `text` | `string`
`j`| `json` | `string`

#### Enum
You can describe a fixed list of possible values separated by `|` within parentheses `()`.
```
MyModel {color: (sample|42|true)}
```

#### References to Other Models
You can reference other models:
```
Dimensions {width: i, height: i}
Color (red|green|blue)
MyModel {dimensions: Dimensions, color: Color}
```

#### Optional Fields
To mark the field as optional, add a question mark (`?`) after the field name, for example:
```
MyModel {field1?, field2?: b}
```
#### Strict Definition Adherence
By default, objects may contain extra fields that are not specified in the model. If you need a strict adherence to the schema, add an exclamation mark (`!`) before the definitions, for example:
```
MyModel !{field1, field2}
```
This is a representation of OpenAPI `additionalProperties: false`.

#### Reusing Previously Defined Model
You can reuse the defined model object and create a new one as needed. Use the less-than sign (`<`) to reuse the object.
When you reuse the object, you can remove a part of its definition. To do this, add a minus sign before the field (`-`).
You can also add additional fields as needed. Here is how you can do this:
```
MyModel {field1, field2}
MyOtherModel < MyModel {-field2, field3}
```
As a result, `MyOtherModel` will have `field1` and `field3` values, but `field2` will be excluded.

#### Multiline Models
Your models may be multiline:
```
MyModel {
    field1,
    field2: b
}
```

### Endpoints (Paths) Definition
Endpoints (_paths_) are described in `endpoints.tinyspec` files. As with models definitions, you can split endpoint definitions into multiple `*.endpoints.tinyspec` files or place them in folders to make the specification easier to maintain.

The basic endpoint definition looks like this:
```
POST /resources {key: Model}
    => {success: b, error: b}
GET /resources
    => {key: Model[]}
```

You can expand it in the following ways:

#### Parameters and Responses
Request _body parameters_ are specified using `{...}` right after the resource name (see example above).

To specify _query parameters_, add the question mark (`?`) after the path and list the query parameters.
You can add multiple parameters by connecting them with the ampersand symbol (`&`).

_Responses_ are specified below the endpoint definitions prefixed with an indent and `=>` sign. You can specify status before the response definition, otherwise the status `200` is used by default.
You can also provide a response description using prefixed with `//`.

Parameters and responses definition format is the same as for models. For example, you can refer to other models, make some parameters optional or specify the required data type:
```
GET /examples?sort&limit?=i
    => {examples: Example[], totalCount?: i}
    // Response description
    => 404 NotFoundError
```

#### Endpoints Description
To create a description for the endpoint, add `//`-prefixed line before its definition. This description supports Markdown. Here is how it looks like:
```
// Get **ALL** objects.
GET /examples
    => {examples: Example[]}
```

#### Automatic Generation of Basic Methods
You can quickly create CRUDL actions (_create_, _retrieve_, _update_, _delete_, _list_) for a specified resources by using a dollar sign (`$`) followed by actions abbreviation (i.e. `$CRUDL`) in place of the request method. For example:

```
$CRUDL /examples
```
This tiny piece would be an equivalent to:
```
// **List** _examples_
GET /examples
    => {examples: Example[]}

// **Create** new _example_
POST /examples {example: ExampleNew}
    => 201 {example: Example}

// **Retrieve** _example_
GET /examples/:id
    => {example: Example}

// **Update** _example_
PATCH /examples/:id {example: ExampleUpdate}
    => {example: Example}

// **Delete** _example_
DELETE /examples/:id
    => {success: b}
```

If you only need some methods, omit the key you do not need (for example `$RD` will only create _retrieve_ and _delete_ actions).

By default the last _path_ member is used to produce model name and payload keys (see above).
Alternatively, you can specify your own key and model name. You can also add postfix `$` to the model name to append `*New` and `*Update` postfixes in generated endpoints:
```
$CRUDL /examples {myKey: MyModel$}
```

#### Authorization
If your API uses authorization, describe the authorization method in the `headers.yaml` file and then address it before the endpoint definition by using the "at" sign (`@`). For example:
```
// header.yaml
securityDefinitions:
  auth:
    name: X-Access-Token
    type: apiKey
    in: header

// examples.endpoints.tinyspec
@auth GET /examples
    => {examples: MyModel}
```

#### Endpoint Tags
Tags let you group endpoints by the parameter you need. For example you can group your endpoints by your API client type or role.
To create a tag, add it with semicolon (`:`) before the definition. For example, to create the `Admin` endpoints group:
```
Admin:
    GET /users
        => {users: User[]}
```
Tags are consistent across all endpoint definition files.

**Note:** OpenAPI requires unique `METHOD /URLs` for each endpoint specified. To make endpoints separated by tags unique, add the group name in brackets:
```
Guest endpoints:
    GET /articles (guest)
        => {articles: Article[]}

Admin endpoints:
    GET /articles (admin)?filter&sort&limit=i
        => {articles: Article[], totalCount: i}
```

### API General Information
For any API information other than API endpoints and models you use the `header.yaml` file. The file should be written in regular OpenAPI format.

### Comments
You can add one-line comments prefixed with symbol `#` in any place. Comments will be ignored during parsing.

## Generating Documentation
To generate OpenAPI or HTML specification from tinyspec format, run it with one of the available options:
```
tinyspec [option]

Options:
    --yaml | -y     Generate OpenAPI/Swagger YAML
    --json | -j     Generate OpenAPI/Swagger JSON
    --html | -h     Generate HTML/CSS document
    --output | -o    Path to place generated files
    --add-nulls     Include `null` as possible value for non-required fields
    --help          Display this help
```

### Generating Documentation for Existing Projects With Support of GitHub Pages
To generate the documentation for GitHub pages from the existing project:

* Install tinyspec locally: `npm install --save-dev tinyspec`.
* Create your `*.tinyspec` definitions and `header.yaml`.
* Edit `package.json` to prepare the documentation for GitHub Pages:
```json
  "scripts": {
    "docs": "tinyspec -h -o ../docs/"
  }
```
* Execute the `npm run docs` command, commit and push changes and check out your GitHub static website.

For more information about GitHub Pages, [see this article](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/).

### Using With Asciidoctor
Check out [this repo](https://github.com/Ajaxy/openapi-asciidoctor) to produce even more beautiful HTML (and PDF) output.

### Tinyspec Cloud
[Tinyspec Cloud](https://tinyspec.cloud) is a documentation hosting service with a themes marketplace launching soon.

## OpenAPI version
The current version of tinyspec produces Swagger/OpenAPI 2.0. The new 3.0 version has got some nice features there, but is not well supported by most third-party tools yet. The compatibility with OpenAPI 3.0 is to be added in future.

## Contributing
Contributions and feedback are always welcome. If you have an idea on how to make tinyspec better, feel free to create an issue and/or pull request.
