# tinyspec
Use simple and clear definitions of models and endpoints to generate full Swagger API specification.
With authentication methods support.

## Instalation
`npm i -g tinyspec`

## Usage
1. Create `header.yml`, `models.tinyspec` and `endpoints.tinyspec` files.
2. Execute `tinyspec`
3. Check out generated `swagger.yml`.

## Sample `models.tinyspec`
```javascript
User {id:i, organizationId:i, email, name, phone, status:i, type:?, createdAt:d}
Organization {id:i, name, password, fallbackNumber}
EmsAgency {id:i, dispatchId:i, organizationId:i, name}
Hospital {id:i, name, specialties, lat:i?, lng:i?}
```

## Sample `endpoints.tinyspec`
```javascript
POST /auth/sign_up {user:User}
    => {success:b}
GET /auth/verify_email?email
    => {success:b}
PUT /auth/email?email&code
    => {token:s}

Client endpoints:
    @token GET /account
        => {user:User}
    @token GET /organizations
        => Organization[]
    @token GET /organizations/:id/ems_agencies
        => EmsAgency[]
    @token GET /hospitals?radius:?&location:?
        => Hospital[]
    @token GET /hospitals/:id
        => Hospital

Server endpoints:
    @apikey POST /organizations {organization:Organization}
        => {success:b}
    @apikey DELETE /organizations
        => {success:b}
```

## Sample `header.yml`
```yaml
swagger: '2.0'
info:
  title: API 1.0
  description: Node.js API Spec
  version: '1.0.0'
schemes:
  - https
produces:
  - application/json
securityDefinitions:
  authkey:
    name: authkey
    type: apiKey
    in: query
  token:
    name: Authorization
    type: apiKey
    in: header
```

## Sample of generated Swagger spec
https://app.swaggerhub.com/api/Ajaxy/Flightcall/2.0.0
