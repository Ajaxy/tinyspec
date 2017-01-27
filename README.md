# tinyspec
Use simple and clear definitions of models and endpoints to generate full Swagger API specification. With token authentication support.

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
public POST /auth/sign_up {user:User}
    => {success:b}

public GET /auth/verify_email?email
    => {success:b}

public PUT /auth/email?email&code
    => {token:s}

GET /account
    => {user:User}

GET /organizations
    => Organization[]

GET /organizations/:id/ems_agencies
    => EmsAgency[]

GET /hospitals?radius:?&location:?
    => Hospital[]

GET /hospitals/:id
    => Hospital
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
  token:
    name: Authorization
    type: apiKey
    in: header
```

## Sample of generated Swagger spec
https://app.swaggerhub.com/api/Ajaxy/Flightcall/2.0.0
