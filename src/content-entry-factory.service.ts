import { parse } from 'yaml'
import { ContentEntry, ENTRY_EXTENSION } from '@commitspark/git-adapter'

interface TreeEntry {
  name: string
  object: {
    __typename: string
    text: string
  }
}

export class ContentEntryFactoryService {
  public createFromBlobsQueryResponseData(
    entries: TreeEntry[],
  ): ContentEntry[] {
    {
      return entries
        .filter(
          (entry: TreeEntry) =>
            entry.name.endsWith(ENTRY_EXTENSION) &&
            entry.object['__typename'] === 'Blob',
        )
        .map((entry: TreeEntry) => {
          const content = parse(entry.object.text)
          const id = entry.name.substring(
            0,
            entry.name.length - ENTRY_EXTENSION.length,
          )
          return {
            id: id,
            metadata: content.metadata,
            data: content.data,
          } as ContentEntry
        })
    }
  }
}
