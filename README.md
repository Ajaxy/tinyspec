# tinyspec
[![NPM version](https://img.shields.io/npm/v/tinyspec.svg)](https://npmjs.com/package/tinyspec)

- [About](#about)  
- [Installing](#installing)  
- [Quick Start](#quick-start)  
- [Tinyspec Syntax](#tinyspec-syntax)  
    - [Object Models Definition](#object-models-definition)  
    - [Endpoints Definition](#endpoints-paths-definition)  
    - [API General Information](#api-general-information)  
- [Generating Documentation](#generating-documentation)  
    - [Using With GitHub Pages](#generating-documentation-for-existing-projects-with-support-of-github-pages)
    - [Using With Asciidoctor](#using-with-asciidoctor)
- [Contributing](#contributing)

## About

Tinyspec offers a lightweight and human-readable alternative to the more verbose [OpenAPI/Swagger](https://github.com/OAI/OpenAPI-Specification) format. It relies on the strengths of the OpenAPI format without the need to maintain the single large JSON or YAML file or to use some special software, instead allowing you to keep your API endpoints and object models in separate and easy to maintain files.

Possible outputs include a full OpenAPI definition in YAML and JSON formats, or the API description in HTML format created with the help of the [bootprint-openapi](https://github.com/bootprint/bootprint-openapi).


## Installing
To use `tinyspec`, install it globally. Use [npm](https://www.npmjs.com/) for it:
```
npm install -g tinyspec
```

## Quick Start
To generate the API documentation, follow these steps:

1. Create [`models.tinyspec`](examples/models.tinyspec), [`endpoints.tinyspec`](examples/endpoints.tinyspec) and [`header.yaml`](examples/header.yaml) files. You can find more information on how to write these files yourself below.
2. Execute the `tinyspec -h` command in the same directory.

You documentation is generated! It is available in the `docs` folder.    
Check out the  [demo](https://ajaxy.github.io/tinyspec/html) to see how the generated documentation looks like.

## Tinyspec Syntax
Tinyspec definition is split into 3 different sections. You specify objects and endpoints that the API uses in the special tinyspec format and place any extra information in the `header.yaml` file.

### Object Models Definition
Object models (_definitions_) are described in `models.tinyspec` files. You can also split object definitions in multiple `*.models.tinyspec` files and even place them in folders to make the API documentation easier to maintain.

The basic object looks like this:
```
MyObject {field1, field2}
```
You can describe any number of objects in a single `*.models.tinyspec` file. By default, all fields are required and accept `string` data values.

#### Intput Data Type
To specify the expected data type, add it after semicolon (`:`). To make fields accept arrays, add brackets (`[]`). For example to define an object:
```
MyObject {field1: s, field2: float[]}
```
You can use the full type name (`string`, `integer`, `boolean`, etc) or a shorthand (`s`, `i`, `b` and so on). Possible values:

Shorthand|Full|OpenAPI type|OpenAPI format|
---------|----|------------|--------------|
`i`| `integer`
`f`| `number`
`s`| `string`
`b`| `boolean`
`d`| `datetime` | `string` | `date-time`
`t`| `text` | `string`
`j`| `json` | `string`
`h`| `hash` | `object`


#### Optional Fields
To mark the field as optional, add a question mark (`?`) after the field name, for example:
```
MyObject {field1?, field2?: b}
```
#### Strict Definition Adherence
By default, requests can contain extra information that is not described in the definition. If you need a strict adherence to the schema, add an exclamation mark (`!`) before the definitions, for example:
```
MyObject !{field1, field2}
```
This is a representation of OpenAPI `additionalProperties: false`.

#### Reusing Previously Defined Model
You can reuse the defined object and create a new one as needed. Use the less-than sign (`<`) to reuse the object. 
When you reuse the object, you can remove a part of its definition. To do this, add a minus sign before the field (`-`). 
You can also add additional objects as needed. Here is how you can do this:
```
MyObject {field1, field2}
MyOtherObject < MyObject {-field2, field3}
```
As a result, `MyOtherObject` will have `field1` and `field3` values, but `field2` will be excluded.

### Endpoints (Paths) Definition
Endpoints (_paths_) are described in `endpoints.tinyspec` files. As with object descriptions, you can split endpoint definitions into multiple `*.endpoints.tinyspec` files or place them in folders to make the documentation easier to maintain.

The basic endpoint description looks like this:
```
POST /resources  {key: Model}
    => {success: b, error: b}
GET /resources
    => {key: Model[]}
```

You can expand it in the following ways:

#### Query Parameters
To specify query parameters, add the question mark (`?`) after the path and list the query parameters. 
You can add multiple parameters by connecting them with the ampersand symbol (`&`).

Query parameter description format is the same as for objects. For example, you can make some parameters optional or specify the required data type:
```
GET /examples?sort&limit?:i
    => {examples: Example[]}
```

#### Endpoints Description
To create a description for the endpoint, add a `//` comment before its specification. This description supports Markdown. Here is how it looks like:
```
// Get **ALL** the objects.
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
// **List** available [`Example`](#/definitions/Example) _records_
GET /examples
    => {examples: Example[]}

// **Create** new [`Example`](#/definitions/Example)
POST /examples {example: ExampleNew}
    => {success: b, id: i}

// **Retrieve** particular [`Example`](#/definitions/Example)
GET /examples/:id
    => {example: Example}

// **Update** particular [`Example`](#/definitions/Example)
PATCH /examples/:id {example: ExampleUpdate}
    => {success: b}

// **Delete** particular [`Example`](#/definitions/Example)
DELETE /examples/:id
    => {success: b}
```

If you only need some methods, omit the key you do not need (for example `$RD` will only create _retrieve_ and _delete_ actions). 

#### Authorization
If your API uses authorization, describe the authorization method in the `headers.yaml` file and then address it in before the endpoint definition by using the at sign (`@`). For example:
```
// header.yaml
securityDefinitions:
  auth:
    name: X-Access-Token
    type: apiKey
    in: header

// examples.endpoints.tinyspec
@auth GET /examples
    => {examples: MyObject}
```

#### Endpoint Tags
Tags let you group endpoints by the parameter you need. For example you can group your endpoints by your API clients type or role.
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
    GET /articles (admin)?filter&sort&limit:i
        => {articles: Article[], totalCount: i}
```

### API General Information
For any API information other than API endpoints and objects you use the `header.yaml` file. The file should be written in regular OpenAPI format.

## Generating Documentation
To generate OpenAPI or HTML specification from tinyspec format, run it with one of the available options:
```
tinyspec [option]

Options:
    --yaml | -y     Generates OpenAPI/Swagger YAML (default).
    --json | -j     Generates OpenAPI/Swagger JSON.
    --html | -h     Generates HTML/CSS document.
    --output | -o   The folder to place generated documentation to. Default: /docs
    --add-nulls     Creates JSON-Schema compliant structure for models. Incompatible with HTML outputs.
    --no-default-attrs     If not specified, `id: i`, `created_at: d` and `updated_at: d` fields are added for all models without underscores(_) at the start.
    --help          Displays this help.
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
* Execute the `npm run docs` command and check out your GitHub static website.

For more information about GitHub Pages, [see this article](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/).

### Using With Asciidoctor
Check out [this repo](https://github.com/Ajaxy/openapi-asciidoctor) to produce even more beautiful HTML (and PDF) output.

## Contributing
Contributions and feedback are always welcome. If you have an idea on how to make tinyspec better, feel free to create an issue and/or pull request.
