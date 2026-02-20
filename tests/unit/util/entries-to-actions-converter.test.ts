import { convertEntriesToActions } from '../../../src/util/entries-to-actions-converter'
import { EntryDraft } from '@commitspark/git-adapter'

describe('entries-to-actions-converter', () => {
  it('should not create double slashes in entry paths', () => {
    const pathEntryFolder = 'commitspark/entries/'
    const entryDrafts: EntryDraft[] = [
      {
        id: 'my-id',
        metadata: { type: 'my-type' },
        data: {},
        deletion: false,
      },
    ]

    const { additions } = convertEntriesToActions(entryDrafts, pathEntryFolder)

    expect(additions[0].path).toBe('commitspark/entries/my-id.yaml')
  })

  it('should handle deletions without double slashes', () => {
    const pathEntryFolder = 'commitspark/entries/'
    const entryDrafts: EntryDraft[] = [
      {
        id: 'my-id',
        metadata: { type: 'my-type' },
        data: {},
        deletion: true,
      },
    ]

    const { deletions } = convertEntriesToActions(entryDrafts, pathEntryFolder)

    expect(deletions[0].path).toBe('commitspark/entries/my-id.yaml')
  })

  it('should throw an error if pathEntryFolder does not end with a slash', () => {
    const pathEntryFolder = 'commitspark/entries'
    const entryDrafts: EntryDraft[] = []

    expect(() =>
      convertEntriesToActions(entryDrafts, pathEntryFolder),
    ).toThrow()
  })
})
