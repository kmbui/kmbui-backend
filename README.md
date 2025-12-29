# KMBUI backend

Built with Elysia on Bun

## Explanation

The KMBUI backend server acts as the main data hub for KMBUI services. As of
right now, it is solely a REST API that serves information for the main KMBUI
website.

## Available resources

The following resources are currently available to query from the REST API:

1. API keys for authentication and authorization
2. Paramita's articles
3. Paramita's magazines

## Usage

There are three levels of authorization within the API:

1. Guest
2. Client
3. Admin

A guest can only access the `POST /key-requests` and `POST /key-claims`
endpoints.

In order to access resources from the API, a guest must make a request for an
API key through the `POST /key-requests` endpoint. The server administrator
holds the responsibility of granting users API keys after a manual verification
process.

Periodically, the client may check to see if their request for an API key has
been approved through the `POST /key-claims` endpoint by entering the receipt
they received when creating an API key request.

After procuring an API key, the user needs to send the API key through the
`X-Api-key` header along with every request for resources.

An administrator may access every endpoint by providing a basic authentication
token in the `Authorization` header. Admin users are created through direct
access to the database.

### Articles and magazines

Paramita's articles and magazines are stored in an S3 compatible object storage
instance. Note that when calling POST and PUT endpoints, the content type header
should be set to `multipart/form-data`.

Articles and magazines start off as drafts, and have to be published by admins
using their respective `PUT /:id/publish` endpoints in order to be accessible to
clients.

## Development

### To-do

1. Use a more secure form of admin authentication (e.g. Bearer, OAuth, 2FA)
2. Add proper API key usage logs and error logging
3. Add proper archival and deletion features for articles and magazines
4. Add more comprehensive testing for the resource CRUD endpoints
5. Add proper error messages for the API keys endpoints

### Environment variables

| Key                  | Value                                               |
| -------------------- | --------------------------------------------------- |
| DATABASE_URL         | URL to Turso database                               |
| DATABASE_AUTH_TOKEN  | Authorization token for Turso database              |
| S3_ENDPOINT          | URL to S3 compatible object storage                 |
| S3_ACCESS_KEY_ID     | S3 compatible object storage's access key ID        |
| S3_SECRET_ACCESS_KEY | S3 compatible object storage's secret access key    |
| S3_REGION            | S3 compatible object storage's region               |
| BUCKET_NAME          | Bucket where all KMBUI backend documents are stored |

### Local testing

To start the development server run:

```bash
bun run dev
```

Open <http://localhost:3000/> with your browser to see the result.

API documentation can be found on <http://localhost:3000/openapi>

### Tests

To run tests with code coverage report, run:

```bash
bun run test
```

> The generated code coverage files can be found in the `./coverage` folder.
> Open `./coverage/html/index.html` in a browser to view the code coverage
> report.

## On arbitrary decisions

When creating a schema for the responses and request body of a handler, refer to
the MDN docs for HTTP status codes. Even if Elysia.js allows you to validate
headers and return a 422 response for invalid headers, prefer 401 Unauthorized
for better conformity to the MDN standards.

## Contacts

For further inquiry about the source code of this application, you can contact
the developers and maintainers of this repo through the KMBUI Discord server.
The following usernames are those of the developers and maintainers:

- tober
