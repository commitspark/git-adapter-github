# Introduction

**[Contentlab](https://contentlab.sh) is a library that generates a fully functional CRUD GraphQL API for structured
text data exclusively from files in a Git repository.**

This repository holds code that implements access to Git repositories hosted on GitHub.

# Usage

Instantiate the adapter with `createAdapter()` and then call `setRepositoryOptions()` with `GitHubRepositoryOptions` on
the instance. These options are as follows:

| Option name           | Description                                                                                                                                |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `repositoryOwner`     | GitHub repository owner, e.g. `contentlab-sh`                                                                                              |
| `repositoryName`      | GitHub repository name, e.g. `git-adapter-github`                                                                                          |
| `personalAccessToken` | GitHub [personal access token (classic)](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql) |

# License

The code in this repository is licensed under the permissive ISC license (see [LICENSE](LICENSE)).
