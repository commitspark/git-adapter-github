# Introduction

**[Commitspark](https://commitspark.com) is a workflow-first Content Management System based on Git and GraphQL.**

This repository holds code that implements access to Git repositories hosted on GitHub.

# Usage

Instantiate the adapter with `createAdapter()` and then call `setRepositoryOptions()` with `GitHubRepositoryOptions` on
the instance. These options are as follows:

| Option name           | Required | Default value           | Description                                                                                                                                                           |
|-----------------------|----------|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `repositoryOwner`     | True     |                         | GitHub repository owner, e.g. `commitspark`                                                                                                                           |
| `repositoryName`      | True     |                         | GitHub repository name, e.g. `git-adapter-github`                                                                                                                     |
| `personalAccessToken` | True     |                         | GitHub [personal access token (classic)](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql) with at least `repo` scope |
| `pathSchemaFile`      | False    | `schema/schema.graphql` | Path to schema file in repository                                                                                                                                     |
| `pathEntryFolder`     | False    | `entries/`              | Path to folder for content entries                                                                                                                                    |

# License

The code in this repository is licensed under the permissive ISC license (see [LICENSE](LICENSE)).
