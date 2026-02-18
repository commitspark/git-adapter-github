# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fix incorrect ESM build configuration leading to broken build output

## [0.30.0] - 2025-11-28

### Added

- Support loading thousands of entries

### Changed

- Increase request timeout to avoid artificially aborting requests
- Upgrade dependencies

## [0.21.0] - 2025-11-11

### Added

- Add error handling and abstraction for GitHub API responses

## [0.20.0] - 2025-11-08

### Changed

- Upgrade to `@commitspark/git-adapter` 0.20.0
- Refactor implementation to drop dependency injection pattern

### Removed

- Removed separate `setRepositoryOptions()` in favor of less complex configuration on instantiation

## [0.8.3] - 2025-09-16

### Changed

- Upgrade dependencies

## [0.8.2] - 2025-06-20

### Fixed

- Fix missing request cache separation for different authorization headers

### Changed

- Upgrade dependencies

## [0.8.1] - 2025-04-16

### Fixed

- Fix incorrect types export

### Changed

- Improve library exports

## [0.8.0] - 2025-04-13

### Changed

- Refactor library packaging to support ESM and CJS
- Clean up dependencies and relax version constraints

## [0.7.0] - 2024-08-23

### Changed

- Rename Git repository option `personalAccessToken` to `accessToken` to better reflect range of usable tokens
- Upgrade dependencies

## [0.6.0] - 2024-08-17

### Changed

- Upgrade to `@commitspark/git-adapter` 0.13.0
- Upgrade dependencies

## [0.5.0] - 2023-12-12

### Changed

- Add eslint
- Upgrade to `@commitspark/git-adapter` 0.10.0 with new default directories
- Reduce number of files included in NPM package

### Fixed

- Switch to GraphQL query variables to prevent string escaping issues
- Fix build process to include only relevant files
- Refactor content entry instantiation to ignore non-blob objects

## [0.4.0] - 2023-05-12

### Changed

- Rename organization

## [0.3.2] - 2023-05-11

### Fixed

- [#3](https://github.com/commitspark/git-adapter-github/issues/3) Fix text content is not UTF-8 encoded when executing
  mutations
- Update `yaml` library to address [security advisory](https://github.com/advisories/GHSA-f9xv-q969-pqx4)

## [0.3.1] - 2023-05-06

### Fixed

- [#2](https://github.com/commitspark/git-adapter-github/issues/2) Fix error when querying repository without content
  entries

## [0.3.0] - 2023-04-28

### Changed

- Replace constructor use with object literals to prevent polluting DTOs with prototype function
- Update to Git Adapter interface 0.7.0

## [0.2.2] - 2023-03-15

### Changed

- Remove dependency injection package to support bundling with webpack & co.
- Upgrade dependencies

## [0.2.1] - 2023-03-12

### Added

- Throw exception when repository not found when retrieving commit hash

### Fixed

- Fix inadvertent use of HTTP cache for some requests

## [0.2.0] - 2022-12-13

### Added

- Expose schema file path and entries folder path as repository options

## [0.1.0] - 2022-11-04

### Added

- Initial release
