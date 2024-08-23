# Introduction

[Commitspark](https://commitspark.com) is a set of tools to manage structured data with Git through a GraphQL API.

This repository holds code for a [Commitspark Git adapter](https://github.com/commitspark/git-adapter) that provides
access to Git repositories hosted on GitHub.

# Usage

Instantiate the adapter with `createAdapter()` and then call `setRepositoryOptions()` with `GitHubRepositoryOptions` on
the instance. These options are as follows:

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

# License

The code in this repository is licensed under the permissive ISC license (see [LICENSE](LICENSE)).
