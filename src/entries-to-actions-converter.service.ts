import { EntryDraft, ENTRY_EXTENSION } from '@commitspark/git-adapter'
import { stringify } from 'yaml'
import { AdditionModel } from './addition.model'
import { DeletionModel } from './deletion.model'

export class EntriesToActionsConverterService {
  convert(
    entryDrafts: EntryDraft[],
    pathEntryFolder: string,
  ): {
    additions: AdditionModel[]
    deletions: DeletionModel[]
  } {
    const additions: AdditionModel[] = []
    const deletions: DeletionModel[] = []
    entryDrafts.forEach((entryDraft) => {
      const entryPath = `${pathEntryFolder}/${entryDraft.id}${ENTRY_EXTENSION}`
      if (entryDraft.deletion) {
        deletions.push(new DeletionModel(entryPath))
      } else {
        additions.push(
          new AdditionModel(
            entryPath,
            stringify({
              metadata: entryDraft.metadata,
              data: entryDraft.data,
            }),
          ),
        )
      }
    })
    return {
      additions,
      deletions,
    }
  }
}
