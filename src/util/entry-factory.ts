import { parse } from 'yaml'
import { Entry } from '@commitspark/git-adapter'
import { ENTRY_EXTENSION } from './types'

interface TreeEntry {
  name: string
  object: {
    __typename: string
    text: string
  }
}

export function createEntriesFromBlobsQueryResponseData(
  entries: TreeEntry[],
): Entry[] {
  return entries
    .filter(
      (entry: TreeEntry) =>
        entry.name.endsWith(ENTRY_EXTENSION) &&
        entry.object['__typename'] === 'Blob',
    )
    .map((entry: TreeEntry) => {
      const fileContent = parse(entry.object.text)
      const id = entry.name.substring(
        0,
        entry.name.length - ENTRY_EXTENSION.length,
      )
      return {
        id: id,
        metadata: fileContent.metadata,
        data: fileContent.data,
      } as Entry
    })
}
