import { parse } from 'yaml'
import { Entry } from '@commitspark/git-adapter'
import { ENTRY_EXTENSION } from '../types.ts'
import { getPathEntryFolder } from './path-factory.ts'
import { GitHubRepositoryOptions } from '../index.ts'

export function createEntriesFromFileContent(
  gitRepositoryOptions: GitHubRepositoryOptions,
  filePathContentMap: Map<string, string>,
): Entry[] {
  return Array.from(filePathContentMap)
    .filter(([filePath]) => filePath.endsWith(ENTRY_EXTENSION))
    .map(([filePath, content]) => {
      const fileContent = parse(content)
      const id = filePath.substring(
        getPathEntryFolder(gitRepositoryOptions).length, // strip folder path back out
        filePath.length - ENTRY_EXTENSION.length,
      )
      return {
        id: id,
        metadata: fileContent.metadata,
        data: fileContent.data,
      } as Entry
    })
}
