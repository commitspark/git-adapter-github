import { AxiosCacheInstance } from 'axios-cache-interceptor'
import { AxiosResponse } from 'axios'
import { ErrorCode } from '@commitspark/git-adapter'
import {
  createCommit,
  getEntriesByIds,
  getEntryHashes,
} from '../../../src/github-adapter'
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
          {
            path: 'commitspark/entries',
            mode: '040000',
            type: 'tree',
            sha: 'sha-folder',
          },
          {
            path: 'commitspark/entries/a.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-a',
          },
          {
            path: 'commitspark/entries/b.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-b',
          },
          {
            path: 'commitspark/entries/README.md',
            mode: '100644',
            type: 'blob',
            sha: 'sha-r',
          },
          {
            path: 'commitspark/schema/schema.graphql',
            mode: '100644',
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

  it('should list entry files in subfolders with their path as ID', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        truncated: false,
        tree: [
          {
            path: 'commitspark/entries/blog/2024/a.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-a',
          },
          {
            path: 'commitspark/entries/blog/b.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-b',
          },
        ],
      },
    } as Partial<AxiosResponse> as AxiosResponse)

    await expect(
      getEntryHashes(mockOptions, mockAxiosInstance, 'abc123'),
    ).resolves.toEqual([
      { id: 'blog/2024/a', hash: 'sha-a' },
      { id: 'blog/b', hash: 'sha-b' },
    ])
  })

  it('should ignore hidden files and folders and symbolic links', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        truncated: false,
        tree: [
          {
            path: 'commitspark/entries/.a.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-a',
          },
          {
            path: 'commitspark/entries/.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-empty',
          },
          {
            path: 'commitspark/entries/.hidden/b.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-b',
          },
          {
            path: 'commitspark/entries/folder/.hidden/c.yaml',
            mode: '100644',
            type: 'blob',
            sha: 'sha-c',
          },
          {
            path: 'commitspark/entries/link.yaml',
            mode: '120000',
            type: 'blob',
            sha: 'sha-link',
          },
          {
            path: 'commitspark/entries/folder/d.yaml',
            mode: '100755',
            type: 'blob',
            sha: 'sha-d',
          },
        ],
      },
    } as Partial<AxiosResponse> as AxiosResponse)

    await expect(
      getEntryHashes(mockOptions, mockAxiosInstance, 'abc123'),
    ).resolves.toEqual([{ id: 'folder/d', hash: 'sha-d' }])
  })

  it('should retrieve entries in subfolders', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        data: {
          repository: {
            file0: { text: 'metadata:\n  type: A\ndata:\n  field: value\n' },
          },
        },
      },
    } as Partial<AxiosResponse> as AxiosResponse)

    const entries = await getEntriesByIds(
      mockOptions,
      mockAxiosInstance,
      'abc123',
      ['blog/a'],
    )

    const query = mockAxiosInstance.post.mock.calls[0][1] as { query: string }
    expect(query.query).toContain('"abc123:commitspark/entries/blog/a.yaml"')
    expect(entries).toEqual([
      { id: 'blog/a', metadata: { type: 'A' }, data: { field: 'value' } },
    ])
  })

  it.each([['../schema/schema'], ['.hidden'], ['folder//a']])(
    'should reject invalid entry ID %s without querying GitHub',
    async (id) => {
      await expect(
        getEntriesByIds(mockOptions, mockAxiosInstance, 'abc123', [id]),
      ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST })
      expect(mockAxiosInstance.post).not.toHaveBeenCalled()
    },
  )

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

  it('should reject commits with invalid entry IDs without calling GitHub', async () => {
    await expect(
      createCommit(mockOptions, mockAxiosInstance, {
        ref: 'main',
        parentSha: 'abc123',
        message: 'test',
        entries: [
          {
            id: '../schema/schema',
            metadata: { type: 'A' },
            data: null,
            deletion: false,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST })
    expect(mockAxiosInstance.post).not.toHaveBeenCalled()
  })
})
