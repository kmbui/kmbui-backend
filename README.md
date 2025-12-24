# KMBUI backend

Built with Elysia on Bun

## Explanation

The KMBUI backend server acts as the main data hub for KMBUI services. As of
right now, it is solely a REST API that serves information for the main KMBUI
website.

## Available resources

The following resources are currently available to query from the REST API:

1. API keys for authentication and authorization

The following resources are currently a work in progress:

1. Paramita's articles
2. Paramita's magazines

## Usage

In order to use the entirety of the API, a user must make a request for an API
key through the `/key-requests` endpoint. The server administrator holds the
responsibility of granting users API keys after a manual verification process.

After procuring an API key, the user needs to send the API key through the
authorization header along with every request for resources.

## Development

### Environment variables

| Key                  | Value                                               |
| -------------------- | --------------------------------------------------- |
| DATABASE_URL         | URL to Turso database                               |
| DATABASE_AUTH_TOKEN  | Authorization token for Turso database              |
| S3_ENDPOINT          | URL to S3 compatible object storage                 |
| S3_ACCESS_KEY_ID     | S3 compatible object storage's access key ID        |
| S3_SECRET_ACCESS_KEY | S3 compatible object storage's secret access key    |
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
