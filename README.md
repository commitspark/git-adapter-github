# Introduction

[Commitspark](https://commitspark.com) is a set of tools to manage structured data with Git through a GraphQL API.

This repository holds code for a [Commitspark Git adapter](https://github.com/commitspark/git-adapter) that provides
access to Git repositories hosted on GitHub.

# Installation

```shell
npm i @commitspark/git-adapter-github
```

# Usage

Instantiate the adapter with `createAdapter()`, providing `GitHubRepositoryOptions` with the following parameters:

| Option name       | Required | Default value                       | Description                                       |
|-------------------|----------|-------------------------------------|---------------------------------------------------|
| `repositoryOwner` | True     |                                     | GitHub repository owner, e.g. `commitspark`       |
| `repositoryName`  | True     |                                     | GitHub repository name, e.g. `git-adapter-github` |
| `accessToken`     | True     |                                     | GitHub access token (see details below)           |
| `pathSchemaFile`  | False    | `commitspark/schema/schema.graphql` | Path to schema file in repository                 |
| `pathEntryFolder` | False    | `commitspark/entries/`              | Path to folder for entries                        |

## Access Token

An `accessToken` may be any one of the following types of tokens:

### Personal Access Tokens (classic)

A [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
with `repo` scope is required.

### Fine-grained Personal Access Tokens

For read-only access,
a [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
with the following repository permissions is sufficient:

| Permission | Access    |
|------------|-----------|
| Contents   | Read-only |
| Metadata   | Read-only |

For write-access, permissions must be as follows:

| Permission | Access         |
|------------|----------------|
| Contents   | Read and write |
| Metadata   | Read-only      |

In both cases, ensure the fine-grained permissions you give actually apply to the repository you want to work with.

### OAuth Tokens

Access tokens for a user obtained
from an [OAuth app](https://docs.github.com/en/apps/oauth-apps/using-oauth-apps/authorizing-oauth-apps) can be used in
the same way (including permissions) as fine-grained personal access tokens.

## Error Handling

This adapter sends requests to the GitHub GraphQL API. In case a request fails, HTTP and GraphQL errors are mapped to
`GitAdapterError` exceptions with `ErrorCode` values from the `@commitspark/git-adapter` package. This enables the
[Commitspark GraphQL API library](https://github.com/commitspark/graphql-api) to handle adapter errors in an
adapter-agnostic way.

### HTTP Status Code Mapping

HTTP error status codes are mapped as follows:

| HTTP Status | GitAdapter ErrorCode |
|-------------|----------------------|
| 400         | `BAD_REQUEST`        |
| 401         | `UNAUTHORIZED`       |
| 403         | `FORBIDDEN`          |
| 404         | `NOT_FOUND`          |
| 409         | `CONFLICT`           |
| 429         | `TOO_MANY_REQUESTS`  |
| Other       | `INTERNAL_ERROR`     |

### GitHub GraphQL API Error Type Mapping

GitHub GraphQL API error types are mapped as follows:

| GitHub Error Type | GitAdapter ErrorCode |
|-------------------|----------------------|
| `NOT_FOUND`       | `NOT_FOUND`          |
| `RATE_LIMITED`    | `TOO_MANY_REQUESTS`  |
| `FORBIDDEN`       | `FORBIDDEN`          |
| `STALE_DATA`      | `CONFLICT`           |
| Other             | `INTERNAL_ERROR`     |

All errors include the original error message from GitHub for debugging purposes.

As GitHub GraphQL error types (codes) are not documented (see
[GitHub documentation issue #22607](https://github.com/github/docs/issues/22607)), mapping of GraphQL error types is
done on a best-effort basis.

# Example

To use this adapter together with the Commitspark GraphQL API library, your code could be the following:

```typescript
import { createAdapter } from '@commitspark/git-adapter-github'
import { createClient } from '@commitspark/graphql-api'

const gitHubAdapter = createAdapter({
  repositoryOwner: process.env.GITHUB_REPOSITORY_OWNER,
  repositoryName: process.env.GITHUB_REPOSITORY_NAME,
  accessToken: process.env.GITHUB_ACCESS_TOKEN,
})

const client = await createClient(gitHubAdapter)
```

# License

The code in this repository is licensed under the permissive ISC license (see [LICENSE](LICENSE)).
