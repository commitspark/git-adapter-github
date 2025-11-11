import { ErrorCode, GitAdapterError } from '@commitspark/git-adapter'
import { AxiosError, AxiosResponse } from 'axios'

export const handleHttpErrors = (error: unknown): never => {
  if (error instanceof AxiosError) {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message

    switch (status) {
      case 400:
        throw new GitAdapterError(ErrorCode.BAD_REQUEST, message)
      case 401:
        throw new GitAdapterError(ErrorCode.UNAUTHORIZED, message)
      case 403:
        throw new GitAdapterError(ErrorCode.FORBIDDEN, message)
      case 404:
        throw new GitAdapterError(ErrorCode.NOT_FOUND, message)
      case 409:
        throw new GitAdapterError(ErrorCode.CONFLICT, message)
      case 429:
        throw new GitAdapterError(ErrorCode.TOO_MANY_REQUESTS, message)
      default:
        throw new GitAdapterError(ErrorCode.INTERNAL_ERROR, message)
    }
  }

  throw new GitAdapterError(
    ErrorCode.INTERNAL_ERROR,
    error instanceof Error ? error.message : 'Unknown error',
  )
}

export const handleGraphQLErrors = (response: AxiosResponse): void => {
  if (response.data.errors) {
    const errors = response.data.errors
    const errorMessage = JSON.stringify(errors)
    const errorType: string | undefined = errors[0]?.type

    // GitHub error types are not documented, and documentation is not planned,
    // see https://github.com/github/docs/issues/22607
    // Error type values below have been discovered through manual testing
    if (errorType === 'NOT_FOUND') {
      throw new GitAdapterError(ErrorCode.NOT_FOUND, errorMessage)
    } else if (errorType === 'RATE_LIMITED') {
      throw new GitAdapterError(ErrorCode.TOO_MANY_REQUESTS, errorMessage)
    } else if (errorType === 'FORBIDDEN') {
      throw new GitAdapterError(ErrorCode.FORBIDDEN, errorMessage)
    } else if (errorType === 'STALE_DATA') {
      throw new GitAdapterError(ErrorCode.CONFLICT, errorMessage)
    } else {
      throw new GitAdapterError(ErrorCode.INTERNAL_ERROR, errorMessage)
    }
  }
}
