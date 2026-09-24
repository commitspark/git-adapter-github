import { GitHubRepositoryOptions } from '../index.ts'
import {
  ENTRY_EXTENSION,
  PATH_ENTRY_FOLDER,
  PATH_SCHEMA_FILE,
} from '../types.ts'

export function getPathSchema(gitRepositoryOptions: GitHubRepositoryOptions) {
  return gitRepositoryOptions.pathSchemaFile ?? PATH_SCHEMA_FILE
}

export function getPathEntryFolder(
  gitRepositoryOptions: GitHubRepositoryOptions,
): string {
  const pathEntryFolder =
    gitRepositoryOptions.pathEntryFolder ?? PATH_ENTRY_FOLDER

  if (!pathEntryFolder.endsWith('/')) {
    return pathEntryFolder + '/'
  }

  return pathEntryFolder
}

export function getPathEntry(
  gitRepositoryOptions: GitHubRepositoryOptions,
  id: string,
): string {
  return `${getPathEntryFolder(gitRepositoryOptions)}${id}${ENTRY_EXTENSION}`
}

export function getEntryIdFromPath(
  gitRepositoryOptions: GitHubRepositoryOptions,
  filePath: string,
): string {
  return filePath.substring(
    getPathEntryFolder(gitRepositoryOptions).length,
    filePath.length - ENTRY_EXTENSION.length,
  )
}
