# tinyspec
It's quite important to quickly create and keep consistent your JSON API documentation. With `tinyspec` you can do it fast and fancy.
`tinyspec` suggests a compact and clear format of describing your models and routes (endpoints) that is compatible with much more verbose OpenAPI/Swagger format.
And it also includes [bootprint-openapi](https://github.com/bootprint/bootprint-openapi) to produce wonderful HTML specification.

## Instalation
`npm i -g tinyspec`

## Fast start
Tinyspec syntax is designed to be intuitive, so you can simply refer to an example to start writing your first tinyspec.

1. Create [`models.tinyspec`](docs/models.tinyspec), [`endpoints.tinyspec`](docs/endpoints.tinyspec) and [`header.yaml`](docs/header.yaml) files.
2. Run `tinyspec -h` in the same directory.
3. Check out generated `html/index.html` — [demo here](https://ajaxy.github.io/tinyspec/html).

## Usage
```bash
tinyspec [option]

Options:
    --yaml | -y     Generate OpenAPI/Swagger YAML (default)
    --json | -j     Generate OpenAPI/Swagger JSON
    --html | -h     Generate HTML/CSS document
    --help          Display this help
```

## Contribution
If you have an idea about how to make things better, feel free to create issue and/or pull request.
