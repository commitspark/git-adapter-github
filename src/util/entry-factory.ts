import { parse } from 'yaml'
import { Entry } from '@commitspark/git-adapter'
import { ENTRY_EXTENSION } from '../types.ts'
import { getEntryIdFromPath } from './path-factory.ts'
import { GitHubRepositoryOptions } from '../index.ts'

export function createEntriesFromFileContent(
  gitRepositoryOptions: GitHubRepositoryOptions,
  filePathContentMap: Map<string, string>,
): Entry[] {
  return Array.from(filePathContentMap)
    .filter(([filePath]) => filePath.endsWith(ENTRY_EXTENSION))
    .map(([filePath, content]) => {
      const fileContent = parse(content)
      return {
        id: getEntryIdFromPath(gitRepositoryOptions, filePath),
        metadata: fileContent.metadata,
        data: fileContent.data,
      } as Entry
    })
}
