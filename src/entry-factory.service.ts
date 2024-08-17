import { parse } from 'yaml'
import { Entry, ENTRY_EXTENSION } from '@commitspark/git-adapter'

interface TreeEntry {
  name: string
  object: {
    __typename: string
    text: string
  }
}

export class EntryFactoryService {
  public createFromBlobsQueryResponseData(entries: TreeEntry[]): Entry[] {
    {
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
  }
}
