import { parse } from 'yaml'
import { Entry } from '@commitspark/git-adapter'
import { ENTRY_EXTENSION } from './types'

export function createEntriesFromBlobsQueryResponseData(
  filenameContentMap: Map<string, string>,
): Entry[] {
  return Array.from(filenameContentMap)
    .filter(([filename]) => filename.endsWith(ENTRY_EXTENSION))
    .map(([filename, content]) => {
      const fileContent = parse(content)
      const id = filename.substring(0, filename.length - ENTRY_EXTENSION.length)
      return {
        id: id,
        metadata: fileContent.metadata,
        data: fileContent.data,
      } as Entry
    })
}
