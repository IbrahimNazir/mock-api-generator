# API System README

This document explains how to use the API system to register users, log in, create APIs, define endpoints with schemas, and work with mock data. The system allows you to create mock APIs with endpoints that support GET, POST, PUT, and PATCH requests. It uses a PostgreSQL database and generates mock data using a library called Faker.

## How to Use the API

The API is accessed at `http://localhost:3000`. You can test it using Postman or cURL commands. The main steps are:

1. Register a user to get an account.
2. Log in to get a token for authentication.
3. Create an API to set up a base path.
4. Create endpoints for the API with schemas to define data structure.
5. Use mock endpoints to create, fetch, or update data, including mock data generation.

Below are detailed instructions for each step.

### 1. Register a User

To use the API, you need a user account. Register a user to create an account.

**Request**:

- **URL**: `POST http://localhost:3000/users/register`
- **Headers**:
  - Content-Type: application/json
- **Body** (JSON):

  ```json
  {
    "username": "ibrahim",
    "email": "ibrahim@example.com",
    "password": "password123",
    "role": "admin"
  }
  ```
- **Description**: Creates a user with username `ibrahim`. The `role` can be `admin` or `user`.

**cURL Command**:

```bash
curl -X POST http://localhost:3000/users/register \
-H "Content-Type: application/json" \
-d '{"username":"ibrahim","email":"ibrahim@example.com","password":"password123","role":"admin"}'
```

**Response** (201 Created):

```json
{
  "user": {
    "id": "<user-id>",
    "username": "ibrahim",
    "email": "ibrahim@example.com",
    "role": "admin",
    "created_at": "2025-06-22T03:06:00Z",
    "updated_at": "2025-06-22T03:06:00Z"
  },
  "token": "<jwt-token>"
}
```

- Save the `token` for authentication in later requests.
- Save the `user-id` if needed.

### 2. Log In

Log in to get a JWT token, which is required for creating APIs, endpoints, and modifying mock data.

**Request**:

- **URL**: `POST http://localhost:3000/users/login`
- **Headers**:
  - Content-Type: application/json
- **Body** (JSON):

  ```json
  {
    "email": "ibrahim@example.com",
    "password": "password123"
  }
  ```
- **Description**: Logs in the user `ibrahim` and returns a token.

**cURL Command**:

```bash
curl -X POST http://localhost:3000/users/login \
-H "Content-Type: application/json" \
-d '{"email":"ibrahim@example.com","password":"password123"}'
```

**Response** (200 OK):

```json
{
  "user": {
    "id": "<user-id>",
    "username": "ibrahim",
    "email": "ibrahim@example.com",
    "role": "admin",
    "created_at": "2025-06-22T03:06:00Z",
    "updated_at": "2025-06-22T03:06:00Z"
  },
  "token": "<jwt-token>"
}
```

- Save the `token` for use in requests that need authentication (e.g., `Authorization: Bearer <jwt-token>`).

### 3. Create an API

An API defines a base path (e.g., `/myapi`) for your mock endpoints. You need a token to create an API.

**Request**:

- **URL**: `POST http://localhost:3000/apis`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer `<jwt-token>`
- **Body** (JSON):

  ```json
  {
    "name": "E-Commerce API",
    "version": "1.0.0",
    "base_path": "/myapi",
    "description": "API for e-commerce operations",
    "is_public": true
  }
  ```
- **Description**:
  - `name`: Name of the API.
  - `version`: Version number (e.g., 1.0.0).
  - `base_path`: URL prefix for mock endpoints (e.g., `/myapi`).
  - `description`: Details about the API.
  - `is_public`: If `true`, GET requests to mock endpoints don’t need a token.

**cURL Command**:

```bash
curl -X POST http://localhost:3000/apis \
-H "Authorization: Bearer <jwt-token>" \
-H "Content-Type: application/json" \
-d '{"name":"E-Commerce API","version":"1.0.0","base_path":"/myapi","description":"API for e-commerce operations","is_public":true}'
```

**Response** (201 Created):

```json
{
  "id": "<api-id>",
  "user_id": "<user-id>",
  "name": "E-Commerce API",
  "version": "1.0.0",
  "base_path": "/myapi",
  "description": "API for e-commerce operations",
  "is_public": true,
  "created_at": "2025-06-22T03:06:00Z",
  "updated_at": "2025-06-22T03:06:00Z"
}
```

- Save the `api-id` for creating endpoints.

### 4. Create Endpoints with Schemas

Endpoints define specific paths (e.g., `/users`) under an API’s base path. Each endpoint has a schema that describes the data structure and supports mock data generation. Below are examples of creating endpoints with different schemas, including simple and complex ones.

#### Endpoint 1: Users (Simple Schema)

Creates an endpoint for user profiles with a nested `profile` object.

**Request**:

- **URL**: `POST http://localhost:3000/endpoints`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer `<jwt-token>`
- **Body** (JSON):

  ```json
  {
    "api_id": "<api-id>",
    "path": "/users",
    "methods": ["GET", "POST", "PUT", "PATCH"],
    "description": "Manage user profiles",
    "mock_enabled": true,
    "mock_count": 2,
    "faker_seed": 123,
    "schema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "faker": "string.uuid"
        },
        "username": {
          "type": "string",
          "faker": "internet.userName",
          "minLength": 3,
          "maxLength": 20
        },
        "email": {
          "type": "string",
          "format": "email",
          "faker": "internet.email",
          "minLength": 5,
          "maxLength": 100
        },
        "profile": {
          "type": "object",
          "properties": {
            "fullName": {
              "type": "string",
              "faker": "name.fullName"
            },
            "age": {
              "type": "integer",
              "faker": "number.int",
              "minimum": 18,
              "maximum": 100
            }
          },
          "required": ["fullName"]
        }
      },
      "required": ["id", "email"]
    }
  }
  ```
- **Description**:
  - `api_id`: ID of the API created earlier.
  - `path`: Endpoint path (e.g., `/users`), forms `/ibrahim/myapi/users`.
  - `methods`: HTTP methods supported (GET, POST, PUT, PATCH).
  - `mock_enabled`: If `true`, generates mock data.
  - `mock_count`: Number of mock resources to create (2 users).
  - `faker_seed`: Number (123) to ensure consistent mock data.
  - `schema`: Defines data structure:
    - `id`: UUID string.
    - `username`: String (3-20 characters).
    - `email`: Email string.
    - `profile`: Object with `fullName` (required) and `age`.
    - `faker`: Uses Faker library to generate mock data (e.g., `string.uuid` for IDs).

**cURL Command**:

```bash
curl -X POST http://localhost:3000/endpoints \
-H "Authorization: Bearer <jwt-token>" \
-H "Content-Type: application/json" \
-d '{"api_id":"<api-id>","path":"/users","methods":["GET","POST","PUT","PATCH"],"description":"Manage user profiles","mock_enabled":true,"mock_count":2,"faker_seed":123,"schema":{"type":"object","properties":{"id":{"type":"string","format":"uuid","faker":"string.uuid"},"username":{"type":"string","faker":"internet.userName","minLength":3,"maxLength":20},"email":{"type":"string","format":"email","faker":"internet.email","minLength":5,"maxLength":100},"profile":{"type":"object","properties":{"fullName":{"type":"string","faker":"name.fullName"},"age":{"type":"integer","faker":"number.int","minimum":18,"maximum":100}},"required":["fullName"]}},"required":["id","email"]}}'
```

**Response** (201 Created):

```json
{
  "endpoint": {
    "id": "<endpoint-id>",
    "api_id": "<api-id>",
    "path": "/users",
    "methods": ["GET", "POST", "PUT", "PATCH"],
    "description": "Manage user profiles",
    "mock_enabled": true,
    "mock_count": 2,
    "faker_seed": 123,
    "schema": { ... },
    "created_at": "2025-06-22T03:06:00Z",
    "updated_at": "2025-06-22T03:06:00Z"
  },
  "resources": [
    {
      "id": "<resource-id-1>",
      "endpoint_id": "<endpoint-id>",
      "data": {
        "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ef",
        "username": "CoolUser123",
        "email": "cooluser123@example.com",
        "profile": {
          "fullName": "Alice Johnson",
          "age": 25
        }
      },
      "created_at": "2025-06-22T03:06:00Z",
      "updated_at": "2025-06-22T03:06:00Z"
    },
    {
      "id": "<resource-id-2>",
      "endpoint_id": "<endpoint-id>",
      "data": {
        "id": "b2c3d4e5-f678-9012-bcde-2345678901fg",
        "username": "StarGazer99",
        "email": "stargazer99@example.com",
        "profile": {
          "fullName": "Bob Smith",
          "age": 32
        }
      },
      "created_at": "2025-06-22T03:06:00Z",
      "updated_at": "2025-06-22T03:06:00Z"
    }
  ]
}
```

- **Mock Data**: Two user profiles are generated using `faker_seed: 123`.
- Save `resource-id-1` for testing mock endpoints.

#### Endpoint 2: Orders (Complex Schema)

Creates an endpoint for orders with a nested array of items.

**Request**:

- **URL**: `POST http://localhost:3000/endpoints`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer `<jwt-token>`
- **Body** (JSON):

  ```json
  {
    "api_id": "<api-id>",
    "path": "/orders",
    "methods": ["GET", "POST", "PATCH"],
    "description": "Manage orders",
    "mock_enabled": true,
    "mock_count": 1,
    "faker_seed": 789,
    "schema": {
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string",
          "format": "uuid",
          "faker": "string.uuid"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "faker": "string.uuid"
        },
        "orderDate": {
          "type": "string",
          "format": "date-time",
          "faker": "date.recent"
        },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "productId": {
                "type": "string",
                "format": "uuid",
                "faker": "string.uuid"
              },
              "quantity": {
                "type": "integer",
                "faker": "number.int",
                "minimum": 1,
                "maximum": 10
              },
              "price": {
                "type": "number",
                "faker": "commerce.price",
                "minimum": 0.01,
                "maximum": 1000
              }
            },
            "required": ["productId", "quantity", "price"]
          },
          "minItems": 1
        },
        "totalAmount": {
          "type": "number",
          "faker": "commerce.price",
          "minimum": 0.01,
          "maximum": 10000
        }
      },
      "required": ["orderId", "userId", "orderDate", "items"]
    }
  }
  ```
- **Description**:
  - `path`: `/orders`, forms `/ibrahim/myapi/orders`.
  - `mock_count`: 1 order.
  - `schema`: Includes:
    - `orderId`, `userId`: UUIDs.
    - `orderDate`: Date-time string.
    - `items`: Array of objects (each with `productId`, `quantity`, `price`).
    - `totalAmount`: Number.

**cURL Command**:

```bash
curl -X POST http://localhost:3000/endpoints \
-H "Authorization: Bearer <jwt-token>" \
-H "Content-Type: application/json" \
-d '{"api_id":"<api-id>","path":"/orders","methods":["GET","POST","PATCH"],"description":"Manage orders","mock_enabled":true,"mock_count":1,"faker_seed":789,"schema":{"type":"object","properties":{"orderId":{"type":"string","format":"uuid","faker":"string.uuid"},"userId":{"type":"string","format":"uuid","faker":"string.uuid"},"orderDate":{"type":"string","format":"date-time","faker":"date.recent"},"items":{"type":"array","items":{"type":"object","properties":{"productId":{"type":"string","format":"uuid","faker":"string.uuid"},"quantity":{"type":"integer","faker":"number.int","minimum":1,"maximum":10},"price":{"type":"number","faker":"commerce.price","minimum":0.01,"maximum":1000}},"required":["productId","quantity","price"]},"minItems":1},"totalAmount":{"type":"number","faker":"commerce.price","minimum":0.01,"maximum":10000}},"required":["orderId","userId","orderDate","items"]}}'
```

**Response** (201 Created):

```json
{
  "endpoint": {
    "id": "<endpoint-id>",
    "api_id": "<api-id>",
    "path": "/orders",
    "methods": ["GET", "POST", "PATCH"],
    "description": "Manage orders",
    "mock_enabled": true,
    "mock_count": 1,
    "faker_seed": 789,
    "schema": { ... },
    "created_at": "2025-06-22T03:06:00Z",
    "updated_at": "2025-06-22T03:06:00Z"
  },
  "resources": [
    {
      "id": "<resource-id>",
      "endpoint_id": "<endpoint-id>",
      "data": {
        "orderId": "d4e5f678-9012-3456-defg-4567890123hi",
        "userId": "e5f67890-1234-5678-efgh-5678901234ij",
        "orderDate": "2025-06-21T12:00:00Z",
        "items": [
          {
            "productId": "f6g78901-2345-6789-fghi-6789012345jk",
            "quantity": 2,
            "price": 99.99
          }
        ],
        "totalAmount": 199.98
      },
      "created_at": "2025-06-22T03:06:00Z",
      "updated_at": "2025-06-22T03:06:00Z"
    }
  ]
}
```

- **Mock Data**: One order with a single item, generated using `faker_seed: 789`.

### 5. Working with Mock Data

Mock endpoints (e.g., `/ibrahim/myapi/users`) allow you to fetch, create, or update data. Mock data is generated automatically when `mock_enabled: true` during endpoint creation. Below are examples using the `/users` endpoint.

#### Get All Users

Fetch all user profiles.

**Request**:

- **URL**: `GET http://localhost:3000/ibrahim/myapi/users`
- **Headers**: None (if `is_public: true`).
- **Description**: Returns an array of all user profiles.

**cURL Command**:

```bash
curl http://localhost:3000/ibrahim/myapi/users
```

**Response** (200 OK):

```json
[
  {
    "id": "<resource-id-1>",
    "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ef",
    "username": "CoolUser123",
    "email": "cooluser123@example.com",
    "profile": {
      "fullName": "Alice Johnson",
      "age": 25
    }
  },
  {
    "id": "<resource-id-2>",
    "id": "b2c3d4e5-f678-9012-bcde-2345678901fg",
    "username": "StarGazer99",
    "email": "stargazer99@example.com",
    "profile": {
      "fullName": "Bob Smith",
      "age": 32
    }
  }
]
```

#### Get Single User

Fetch a specific user by resource ID.

**Request**:

- **URL**: `GET http://localhost:3000/ibrahim/myapi/users/<resource-id-1>`
- **Headers**: None (if `is_public: true`).

**cURL Command**:

```bash
curl http://localhost:3000/ibrahim/myapi/users/<resource-id-1>
```

**Response** (200 OK):

```json
{
  "id": "<resource-id-1>",
  "username": "CoolUser123",
  "email": "cooluser123@example.com",
  "profile": {
    "fullName": "Alice Johnson",
    "age": 25
  }
}
```

#### Create a User

Add a new user profile.

**Request**:

- **URL**: `POST http://localhost:3000/ibrahim/myapi/users`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer `<jwt-token>`
- **Body** (JSON):

  ```json
  {
    "data": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "newuser",
      "email": "newuser@example.com",
      "profile": {
        "fullName": "New User",
        "age": 28
      }
    }
  }
  ```
- **Description**: The `data` must match the endpoint’s schema (e.g., include `id`, `email`).

**cURL Command**:

```bash
curl -X POST http://localhost:3000/ibrahim/myapi/users \
-H "Authorization: Bearer <jwt-token>" \
-H "Content-Type: application/json" \
-d '{"data":{"id":"123e4567-e89b-12d3-a456-426614174000","username":"newuser","email":"newuser@example.com","profile":{"fullName":"New User","age":28}}}'
```

**Response** (201 Created):

```json
{
  "id": "<new-resource-id>",
  "username": "newuser",
  "email": "newuser@example.com",
  "profile": {
    "fullName": "New User",
    "age": 28
  }
}
```

#### Update a User (PATCH)

Update part of a user profile.

**Request**:

- **URL**: `PATCH http://localhost:3000/ibrahim/myapi/users/<resource-id-1>`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer `<jwt-token>`
- **Body** (JSON):

  ```json
  {
    "id": "<resource-id-1>",
    "data": {
      "email": "patched@example.com"
    }
  }
  ```
- **Description**: Updates only the `email` field, keeping other fields unchanged.

**cURL Command**:

```bash
curl -X PATCH http://localhost:3000/ibrahim/myapi/users/<resource-id-1> \
-H "Authorization: Bearer <jwt-token>" \
-H "Content-Type: application/json" \
-d '{"data":{"email":"patched@example.com"}}'
```

**Response** (200 OK):

```json
{
  "id": "<resource-id-1>",
  "username": "CoolUser123",
  "email": "patched@example.com",
  "profile": {
    "fullName": "Alice Johnson",
    "age": 25
  }
}
```

### 6. Mock Data Generation

Mock data is generated when you create an endpoint with `mock_enabled: true`. The `faker_seed` ensures the same data is generated each time for testing.

- **How It Works**:
  - The `schema` uses `faker` properties (e.g., `string.uuid`, `internet.email`) to generate realistic data.
  - `mock_count` sets how many resources to create.
  - `faker_seed` (e.g., 123) makes the data consistent across runs.
- **Example** (from `/users` endpoint):
  - With `faker_seed: 123` and `mock_count: 2`, you get two user profiles with predictable usernames, emails, etc.
  - If you recreate the endpoint with the same `faker_seed`, the same data is generated.
- **Use Cases**:
  - Test API responses without manually adding data.
  - Verify schema validation (e.g., `email` format, `age` range).
  - Debug by reproducing the same mock data.