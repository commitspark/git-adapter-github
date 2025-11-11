import { AxiosCacheInstance } from 'axios-cache-interceptor'
import { AxiosError, AxiosResponse } from 'axios'
import { ErrorCode, GitAdapterError } from '@commitspark/git-adapter'
import {
  createCommit,
  getEntries,
  getLatestCommitHash,
  getSchema,
} from '../../src/github-adapter'
import { GitHubRepositoryOptions } from '../../src'

describe('Error mapping', () => {
  const mockOptions: GitHubRepositoryOptions = {
    repositoryOwner: 'test-owner',
    repositoryName: 'test-repo',
    accessToken: 'test-token',
  }

  let mockAxiosInstance: jest.Mocked<AxiosCacheInstance>

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
    } as unknown as jest.Mocked<AxiosCacheInstance>
  })

  describe('getEntries', () => {
    describe('HTTP error mapping', () => {
      it('should throw GitAdapterError with NOT_FOUND when axios returns 404', async () => {
        const axiosError = new AxiosError('Not Found')
        axiosError.response = {
          status: 404,
          data: { message: 'Repository not found' },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockRejectedValue(axiosError)

        await expect(
          getEntries(mockOptions, mockAxiosInstance, 'abc123'),
        ).rejects.toThrow(
          new GitAdapterError(ErrorCode.NOT_FOUND, 'Repository not found'),
        )
      })
    })

    describe('GraphQL error mapping', () => {
      it('should throw GitAdapterError with NOT_FOUND when GraphQL returns NOT_FOUND error', async () => {
        const graphqlResponse: AxiosResponse = {
          data: {
            errors: [
              {
                type: 'NOT_FOUND',
                message: 'Resource not found',
              },
            ],
          },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockResolvedValue(graphqlResponse)

        await expect(
          getEntries(mockOptions, mockAxiosInstance, 'abc123'),
        ).rejects.toThrow(
          new GitAdapterError(
            ErrorCode.NOT_FOUND,
            JSON.stringify(graphqlResponse.data.errors),
          ),
        )
      })
    })
  })

  describe('getSchema', () => {
    describe('HTTP error mapping', () => {
      it('should throw GitAdapterError with FORBIDDEN when axios returns 403', async () => {
        const axiosError = new AxiosError('Forbidden')
        axiosError.response = {
          status: 403,
          data: { message: 'Access forbidden' },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockRejectedValue(axiosError)

        await expect(
          getSchema(mockOptions, mockAxiosInstance, 'abc123'),
        ).rejects.toThrow(
          new GitAdapterError(ErrorCode.FORBIDDEN, 'Access forbidden'),
        )
      })
    })

    describe('GraphQL error mapping', () => {
      it('should throw GitAdapterError with FORBIDDEN when GraphQL returns FORBIDDEN error', async () => {
        const graphqlResponse: AxiosResponse = {
          data: {
            errors: [
              {
                type: 'FORBIDDEN',
                message: 'Access denied',
              },
            ],
          },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockResolvedValue(graphqlResponse)

        await expect(
          getSchema(mockOptions, mockAxiosInstance, 'abc123'),
        ).rejects.toThrow(
          new GitAdapterError(
            ErrorCode.FORBIDDEN,
            JSON.stringify(graphqlResponse.data.errors),
          ),
        )
      })
    })
  })

  describe('getLatestCommitHash', () => {
    describe('HTTP error mapping', () => {
      it('should throw GitAdapterError with UNAUTHORIZED when axios returns 401', async () => {
        const axiosError = new AxiosError('Unauthorized')
        axiosError.response = {
          status: 401,
          data: { message: 'Invalid credentials' },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockRejectedValue(axiosError)

        await expect(
          getLatestCommitHash(mockOptions, mockAxiosInstance, 'main'),
        ).rejects.toThrow(
          new GitAdapterError(ErrorCode.UNAUTHORIZED, 'Invalid credentials'),
        )
      })
    })

    describe('GraphQL error mapping', () => {
      it('should throw GitAdapterError with TOO_MANY_REQUESTS when GraphQL returns RATE_LIMITED error', async () => {
        const graphqlResponse: AxiosResponse = {
          data: {
            errors: [
              {
                type: 'RATE_LIMITED',
                message: 'Rate limit exceeded',
              },
            ],
          },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockResolvedValue(graphqlResponse)

        await expect(
          getLatestCommitHash(mockOptions, mockAxiosInstance, 'main'),
        ).rejects.toThrow(
          new GitAdapterError(
            ErrorCode.TOO_MANY_REQUESTS,
            JSON.stringify(graphqlResponse.data.errors),
          ),
        )
      })
    })
  })

  describe('createCommit', () => {
    const mockCommitDraft = {
      ref: 'main',
      message: 'Test commit',
      parentSha: 'parent123',
      entries: [],
    }

    describe('HTTP error mapping', () => {
      it('should throw GitAdapterError with CONFLICT when axios returns 409', async () => {
        const axiosError = new AxiosError('Conflict')
        axiosError.response = {
          status: 409,
          data: { message: 'Merge conflict detected' },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockRejectedValue(axiosError)

        await expect(
          createCommit(mockOptions, mockAxiosInstance, mockCommitDraft),
        ).rejects.toThrow(
          new GitAdapterError(ErrorCode.CONFLICT, 'Merge conflict detected'),
        )
      })
    })

    describe('GraphQL error mapping', () => {
      it('should throw GitAdapterError with CONFLICT when GraphQL returns STALE_DATA error', async () => {
        const graphqlResponse: AxiosResponse = {
          data: {
            errors: [
              {
                type: 'STALE_DATA',
                message: 'The expected head OID does not match',
              },
            ],
          },
        } as Partial<AxiosResponse> as AxiosResponse

        mockAxiosInstance.post.mockResolvedValue(graphqlResponse)

        await expect(
          createCommit(mockOptions, mockAxiosInstance, mockCommitDraft),
        ).rejects.toThrow(
          new GitAdapterError(
            ErrorCode.CONFLICT,
            JSON.stringify(graphqlResponse.data.errors),
          ),
        )
      })
    })
  })
})
