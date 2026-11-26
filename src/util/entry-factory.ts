import { parse } from 'yaml'
import { Entry, ErrorCode, GitAdapterError } from '@commitspark/git-adapter'
import { ENTRY_EXTENSION } from '../types.ts'
import { getEntryIdFromPath } from './path-factory.ts'
import { GitHubRepositoryOptions } from '../index.ts'

export function createEntriesFromFileContent(
  gitRepositoryOptions: GitHubRepositoryOptions,
  filePathContentMap: Map<string, string>,
): Entry[] {
  return Array.from(filePathContentMap)
    .filter(([filePath]) => filePath.endsWith(ENTRY_EXTENSION))
    .map(([filePath, content]) =>
      parseEntry(getEntryIdFromPath(gitRepositoryOptions, filePath), content),
    )
}

const parseEntry = (id: string, fileContent: string): Entry => {
  let content: unknown
  try {
    content = parse(fileContent)
  } catch (error) {
    throw new GitAdapterError(
      ErrorCode.BAD_REPOSITORY_DATA,
      `Entry file of entry "${id}" is no valid YAML: ${(error as Error).message}`,
    )
  }
  if (
    typeof content !== 'object' ||
    content === null ||
    Array.isArray(content)
  ) {
    throw new GitAdapterError(
      ErrorCode.BAD_REPOSITORY_DATA,
      `Entry file of entry "${id}" does not contain a YAML mapping`,
    )
  }
  const { metadata, data } = content as Pick<Entry, 'metadata' | 'data'>
  return { id: id, metadata: metadata, data: data }
}
