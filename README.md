# tinyspec
It's quite important to quickly create and keep consistent your JSON API documentation. With `tinyspec` you can do it fast and fancy.
`tinyspec` suggests a compact and clear format of describing your models and routes (endpoints) that is compatible with much more verbose OpenAPI/Swagger format.
And it also includes [bootprint-openapi](bootprint/bootprint-openapi) to produce wonderful HTML specification.

## Instalation
`npm i -g tinyspec`

## Fast start
Tinyspec syntax is designed to be intuitive, so you can simply refer to an example to start writing your first tinyspec.

1. Create `[models.tinyspec](anywaylabs/tinyspec/example/models.tinyspec)`, `[endpoints.tinyspec](anywaylabs/tinyspec/example/models.endpoints)` and `[header.yaml](anywaylabs/tinyspec/example/models.yaml)` files.
2. Run `tinyspec -h` in the same directory.
3. Check out generated `html/index.html` — [demo here](https://anywaylabs.github.io/tinyspec).

## Usage
```bash
tinyspec [options]

Options:
    --yaml | -y     Generate OpenAPI/Swagger YAML (default)
    --json | -j     Generate OpenAPI/Swagger JSON
    --html | -h     Generate HTML/CSS document
```