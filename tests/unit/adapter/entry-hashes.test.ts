import { AxiosCacheInstance } from 'axios-cache-interceptor'
import { AxiosResponse } from 'axios'
import { getEntriesByIds, getEntryHashes } from '../../../src/github-adapter'
import { GitHubRepositoryOptions } from '../../../src'

describe('Entry hashes', () => {
  const mockOptions: GitHubRepositoryOptions = {
    repositoryOwner: 'test-owner',
    repositoryName: 'test-repo',
    accessToken: 'test-token',
  }

  let mockAxiosInstance: jest.Mocked<AxiosCacheInstance>

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<AxiosCacheInstance>
  })

  it('should list entry files with their blob hash', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        truncated: false,
        tree: [
          { path: 'commitspark/entries', type: 'tree', sha: 'sha-folder' },
          { path: 'commitspark/entries/a.yaml', type: 'blob', sha: 'sha-a' },
          { path: 'commitspark/entries/b.yaml', type: 'blob', sha: 'sha-b' },
          { path: 'commitspark/entries/README.md', type: 'blob', sha: 'sha-r' },
          {
            path: 'commitspark/schema/schema.graphql',
            type: 'blob',
            sha: 'sha-s',
          },
        ],
      },
    } as Partial<AxiosResponse> as AxiosResponse)

    await expect(
      getEntryHashes(mockOptions, mockAxiosInstance, 'abc123'),
    ).resolves.toEqual([
      { id: 'a', hash: 'sha-a' },
      { id: 'b', hash: 'sha-b' },
    ])
  })

  it('should retrieve only requested entries', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        data: {
          repository: {
            file0: { text: 'metadata:\n  type: A\ndata:\n  field: value\n' },
            file1: null,
          },
        },
      },
    } as Partial<AxiosResponse> as AxiosResponse)

    const entries = await getEntriesByIds(
      mockOptions,
      mockAxiosInstance,
      'abc123',
      ['a', 'missing'],
    )

    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1)
    const query = mockAxiosInstance.post.mock.calls[0][1] as { query: string }
    expect(query.query).toContain('"abc123:commitspark/entries/a.yaml"')
    expect(query.query).toContain('"abc123:commitspark/entries/missing.yaml"')
    expect(entries).toEqual([
      { id: 'a', metadata: { type: 'A' }, data: { field: 'value' } },
    ])
  })

  it('should not query GitHub when no entries are requested', async () => {
    await expect(
      getEntriesByIds(mockOptions, mockAxiosInstance, 'abc123', []),
    ).resolves.toEqual([])
    expect(mockAxiosInstance.post).not.toHaveBeenCalled()
  })
})
