# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Rename organization

## [0.3.2] - 2023-05-11
### Fixed
- [#3](https://github.com/commitspark/git-adapter-github/issues/3) Fix text content is not UTF-8 encoded when executing mutations
- Update `yaml` library to address [security advisory](https://github.com/advisories/GHSA-f9xv-q969-pqx4)

## [0.3.1] - 2023-05-06
### Fixed
- [#2](https://github.com/commitspark/git-adapter-github/issues/2) Fix error when querying repository without content entries

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
