import { AxiosCacheInstance, CacheAxiosResponse } from 'axios-cache-interceptor'
import {
  Commit,
  CommitDraft,
  Entry,
  ErrorCode,
  GitAdapterError,
} from '@commitspark/git-adapter'
import { GitHubRepositoryOptions } from './index.ts'
import {
  createSingleBlobContentQuery,
  createCommitMutation,
  createLatestCommitQuery,
} from './github-api/graphql-query-factory.ts'
import { convertEntriesToActions } from './util/entries-to-actions-converter.ts'
import { getPathEntryFolder, getPathSchema } from './util/path-factory.ts'
import { createEntriesFromFileContent } from './util/entry-factory.ts'
import { handleGraphQLErrors, handleHttpErrors } from './errors.ts'
import { getEntryContent } from './github-api/get-entry-content.ts'
import { getFilePaths } from './github-api/get-file-paths.ts'
import { GITHUB_GRAPHQL_API_URL } from './types.ts'

export const getEntries = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
): Promise<Entry[]> => {
  const filenames: string[] = await getFilePaths(
    gitRepositoryOptions,
    axiosCacheInstance,
    commitHash,
  )

  const filePathsContentMap = await getEntryContent(
    gitRepositoryOptions,
    axiosCacheInstance,
    commitHash,
    filenames,
  )

  return createEntriesFromFileContent(gitRepositoryOptions, filePathsContentMap)
}

export const getSchema = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
): Promise<string> => {
  const repositoryOwner = gitRepositoryOptions.repositoryOwner
  const repositoryName = gitRepositoryOptions.repositoryName
  const token = gitRepositoryOptions.accessToken
  const schemaFilePath = getPathSchema(gitRepositoryOptions)

  const queryContent = createSingleBlobContentQuery()

  let response: CacheAxiosResponse | undefined
  try {
    response = await axiosCacheInstance.post(
      GITHUB_GRAPHQL_API_URL,
      {
        query: queryContent,
        variables: {
          repositoryOwner: repositoryOwner,
          repositoryName: repositoryName,
          expression: `${commitHash}:${schemaFilePath}`,
        },
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    )
  } catch (error) {
    handleHttpErrors(error)
  }

  if (!response) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      `Failed to fetch schema`,
    )
  }

  handleGraphQLErrors(response)

  const schema = response.data?.data?.repository?.object?.text

  if (!schema) {
    throw new GitAdapterError(
      ErrorCode.NOT_FOUND,
      `"${schemaFilePath}" not found in Git repository "${repositoryOwner}/${repositoryName}" at commit "${commitHash}"`,
    )
  }

  return schema
}

export const getLatestCommitHash = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  ref: string,
): Promise<string> => {
  const token = gitRepositoryOptions.accessToken

  const queryLatestCommit = createLatestCommitQuery()

  let response: CacheAxiosResponse | undefined
  try {
    response = await axiosCacheInstance.post(
      GITHUB_GRAPHQL_API_URL,
      {
        query: queryLatestCommit,
        variables: {
          repositoryOwner: gitRepositoryOptions.repositoryOwner,
          repositoryName: gitRepositoryOptions.repositoryName,
          ref: ref,
        },
      },
      {
        cache: false, // must not use cache, so we always get the branch's current head
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    )
  } catch (error) {
    handleHttpErrors(error)
  }

  if (!response) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch latest commit',
    )
  }
  handleGraphQLErrors(response)

  if (!response.data.data.repository) {
    throw new GitAdapterError(
      ErrorCode.NOT_FOUND,
      `No repository found "${gitRepositoryOptions.repositoryOwner}/${gitRepositoryOptions.repositoryName}"`,
    )
  }

  const lastCommit =
    response.data.data.repository.ref?.target?.oid ??
    response.data.data.repository.object?.oid ??
    undefined
  if (!lastCommit) {
    throw new GitAdapterError(
      ErrorCode.NOT_FOUND,
      `No commit found for ref "${ref}"`,
    )
  }

  return lastCommit
}

export const createCommit = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitDraft: CommitDraft,
): Promise<Commit> => {
  const token = gitRepositoryOptions.accessToken
  const pathEntryFolder = getPathEntryFolder(gitRepositoryOptions)

  const { additions, deletions } = convertEntriesToActions(
    commitDraft.entries,
    pathEntryFolder,
  )

  const mutateCommit = createCommitMutation()

  let response: CacheAxiosResponse | undefined
  try {
    response = await axiosCacheInstance.post(
      GITHUB_GRAPHQL_API_URL,
      {
        query: mutateCommit,
        variables: {
          repositoryNameWithOwner: `${gitRepositoryOptions.repositoryOwner}/${gitRepositoryOptions.repositoryName}`,
          branchName: commitDraft.ref,
          commitMessage: commitDraft.message ?? '-',
          precedingCommitSha: commitDraft.parentSha,
          additions: additions,
          deletions: deletions,
        },
      },
      {
        cache: false,
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    )
  } catch (error) {
    handleHttpErrors(error)
  }

  if (!response) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      `Failed to create commit`,
    )
  }

  handleGraphQLErrors(response)

  const mutationResult = response.data.data.commitCreate

  if (mutationResult.errors) {
    const errorMessage = JSON.stringify(mutationResult.errors)
    throw new GitAdapterError(
      ErrorCode.BAD_REQUEST,
      `Failed to create commit: ${errorMessage}`,
    )
  }

  return { commitHash: mutationResult.commit.oid }
}
