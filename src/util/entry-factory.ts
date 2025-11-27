import { parse } from 'yaml'
import { Entry } from '@commitspark/git-adapter'
import { ENTRY_EXTENSION } from '../types'
import { getPathEntryFolder } from './path-factory'
import { GitHubRepositoryOptions } from '../index'

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
