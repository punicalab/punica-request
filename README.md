# Introduction

Welcome to the documentation for our open-source promise-based HTTP request library! This library is designed to offer a flexible, extensible, and efficient solution for making HTTP requests in various environments, including the browser (via XHR and Fetch) and Node.js (using the HTTP module).

## Key Features

1. **Adapter Pattern** The library uses an adapter pattern, allowing you to easily switch between different underlying implementations such as XHR, Fetch, or Node.js's HTTP class. This provides a unified API for making HTTP requests regardless of the environment you're working in. To switch adapters, simply configure the library with your desired adapter during initialization. Check the setup section for detailed instructions.

2. **Promise-based** Built on JavaScript promises, the library ensures that asynchronous operations are handled smoothly. Promises make it easier to work with asynchronous code and integrate seamlessly with modern JavaScript, providing a clean and manageable way to handle HTTP requests and responses. Familiarize yourself with JavaScript promises and async/await syntax to fully leverage the power of this library.

3. **Middleware System** One of the standout features of our library is its middleware system. You can create and manage both request and response middlewares using linked list structures. This allows for powerful and flexible manipulation and handling of HTTP requests and responses. Whether you need to log requests, handle authentication, transform data, or implement error handling, our middleware system provides a straightforward way to extend and control the behavior of your HTTP operations.

4. **TypeScript Support** The library offers full TypeScript support with comprehensive type definitions, ensuring better error checking and autocompletion during development. If you are using TypeScript, review and include the type definition files in your project setup.

5. **Flexible Configuration** The library allows for both global and per-request configurations. This enables you to set default settings and easily override them for individual requests. Refer to the configuration section for detailed information on available options.

6. **Built-in Error Handling** Offers comprehensive error handling features to easily catch and manage errors. Create custom error handlers and add error management middleware as needed.

7. **Handling JSON and Other Data Types** While it makes working with JSON data easy, it also supports other data types. Create custom error handlers and add error management middleware as needed.

8. **Cancelable Requests** Provides the ability to cancel ongoing HTTP requests, which is particularly useful in scenarios where user interactions change rapidly. Utilize cancellation tokens to create cancelable requests.

## How It Works

The library's core is built around the concept of adapters and middlewares:

- **Adapters:** Adapters are classes that implement a common interface for sending HTTP requests. Depending on your environment, you can choose an appropriate adapter (XHR, Fetch, or Node HTTP) that suits your needs. This design ensures that your code remains consistent and adaptable across different platforms.

- **Middleware:** Middleware functions act as interceptors that can process requests and responses before they are handled by the final adapter. Middlewares are organized in a linked list structure, allowing for sequential execution. You can easily add, remove, or modify middleware to tailor the behavior of your HTTP requests.

## Benefits

- **Flexibility:** The adapter pattern and middleware system provide unparalleled flexibility, allowing you to customize and extend the library to fit your specific use cases.

- **Consistency:** With a unified API across different environments, you can write code that is consistent and easy to maintain.

- **Ease of Use:** The promise-based approach simplifies asynchronous programming, making it easier to write, read, and debug your code.

# Basic Usage

This document provides examples of how to use the **Punica Request** library for various **HTTP** operations such as **GET**, **POST**, **PUT**, **DELETE**, and **PATCH**.

## Setting Up the Service

First, create a service instance using the `createService` function. This function sets up the base configuration for making HTTP requests.

```typescript
import { IConfig, RequestAPI } from '@punica/request';
import { APIFetch } from '@punica/request-fetch';
import { TokenAuthMiddleware } from '@punica/request-middleware';

/**
 * Creates a service instance for making HTTP requests with Punica Request.
 * @param {string} hostname The base URL for the API requests.
 * @returns {RequestAPI} A RequestAPI instance configured with the specified hostname.
 */
const createService = (hostname: string): RequestAPI => {
  const config: IConfig = {
    request: {
      hostname,
      requestInit: {
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
      },
    },
    middleware: {
      request: [
        new TokenAuthMiddleware({ cookieName: "token", headerName: "Authorization" }),
      ],
      response: [
        new CacheResponseMiddleware({ storage }),
        new ErrorMiddleware({
          contentType: 'json',
          error: {
            400: error400,
            500: error500,
            401: error401,
            403: error403,
            404: error404,
            409: error409
          }
        })
      ]
    }

  };

  return new RequestAPI(new APIFetch(), config);
};

const SERVICE = createService("hostName");t SERVICE = createService("hostName");
```

## Performing HTTP Operations

Below are examples of how to perform different HTTP operations using the SERVICE instance created above.

### DELETE Operation

Deletes an item with the specified itemId.

```typescript
/**
 * Deletes an item by its ID.
 * @param {string} itemId The ID of the item to delete.
 * @returns {Promise<Response>} The response from the server.
 */
const deleteOperation = async (itemId: string) => {
  const res = await SERVICE.delete({
    path: `items/${itemId}`
  });

  return res;
};
```

### GET Operation

Retrieves a list of items based on the specified search parameters.

```typescript
/**
 * Retrieves items based on search parameters.
 * @param {URLSearchParams} searchParams The search parameters.
 * @returns {Promise<Response>} The response from the server.
 */
const getOperation = async (searchParams: URLSearchParams) => {
  const res = await SERVICE.get({
    path: `items`,
    query: searchParams,
    contentType: 'json'
  });

  return res;
};
```

### POST Operation

Creates a new item with the provided data.

```typescript
/**
 * Creates a new item.
 * @param {Model} data The data for the new item.
 * @returns {Promise<Response>} The response from the server.
 */
const postOperation = async (data: Model) => {
  const res = await SERVICE.post({
    path: `items`,
    data: JSON.stringify(data),
    contentType: 'json'
  });

  return res;
};
```

### PUT Operation

Updates an existing item with the specified itemId and data.

```typescript
/**
 * Updates an item by its ID.
 * @param {string} itemId The ID of the item to update.
 * @param {Model} data The updated data for the item.
 * @returns {Promise<Response>} The response from the server.
 */
const putOperation = async (itemId: string, data: Model) => {
  const res = await SERVICE.put({
    path: `items/${itemId}`,
    data: JSON.stringify(data),
    contentType: 'json'
  });

  return res;
};
```

### PATCH Operation

Partially updates an existing item with the specified itemId and data.

```typescript
/**
 * Partially updates an item by its ID.
 * @param {string} itemId The ID of the item to update.
 * @param {Array<IPatch>} data The partial data for the item.
 * @returns {Promise<Response>} The response from the server.
 */
const patchOperation = async (itemId: string, data: Array<IPatch>) => {
  const res = await SERVICE.patch({
    path: `items/${itemId}`,
    data: JSON.stringify(data)
  });

  return res;
};
```
