import { AxiosCacheInstance, CacheAxiosResponse } from 'axios-cache-interceptor'
import {
  Commit,
  CommitDraft,
  Entry,
  ErrorCode,
  GitAdapterError,
} from '@commitspark/git-adapter'
import { GitHubRepositoryOptions } from './index'
import {
  createBlobsContentByFilenamesQuery,
  createBlobsContentQuery,
  createCommitMutation,
  createFilenamesQuery,
  createLatestCommitQuery,
} from './util/graphql-query-factory'
import { convertEntriesToActions } from './util/entries-to-actions-converter'
import { getPathEntryFolder, getPathSchema } from './util/path-factory'
import { createEntriesFromBlobsQueryResponseData } from './util/entry-factory'
import { handleGraphQLErrors, handleHttpErrors } from './errors'
import { QUERY_BATCH_SIZE } from './util/types'

export const API_URL = 'https://api.github.com/graphql'

export const getEntries = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
): Promise<Entry[]> => {
  const token = gitRepositoryOptions.accessToken
  const pathEntryFolder = getPathEntryFolder(gitRepositoryOptions)
  const folderExpression = `${commitHash}:${pathEntryFolder}`

  const filenamesQuery = createFilenamesQuery()
  let filenamesResponse: CacheAxiosResponse | undefined
  try {
    filenamesResponse = await axiosCacheInstance.post(
      API_URL,
      {
        query: filenamesQuery,
        variables: {
          repositoryOwner: gitRepositoryOptions.repositoryOwner,
          repositoryName: gitRepositoryOptions.repositoryName,
          expression: folderExpression,
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

  if (!filenamesResponse) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch entry filenames',
    )
  }

  handleGraphQLErrors(filenamesResponse)

  const entries = filenamesResponse.data.data.repository?.object?.entries
  if (!entries || !Array.isArray(entries)) {
    return []
  }

  const filenames: string[] = entries.map((entry) => entry.name)

  const filenameContentMap = new Map<string, string>()

  const { queries, queryFilenameAliasMap } = createBlobsContentByFilenamesQuery(
    folderExpression,
    filenames,
    QUERY_BATCH_SIZE,
  )
  const requestPromises = []
  for (const contentQuery of queries) {
    try {
      requestPromises.push(
        axiosCacheInstance
          .post(
            API_URL,
            {
              query: contentQuery,
              variables: {
                repositoryOwner: gitRepositoryOptions.repositoryOwner,
                repositoryName: gitRepositoryOptions.repositoryName,
              },
            },
            {
              headers: {
                authorization: `Bearer ${token}`,
              },
            },
          )
          .then((contentResponse) => {
            handleGraphQLErrors(contentResponse)
            const files = contentResponse.data.data.repository as Record<
              string,
              { text: string }
            >

            for (const [queryAlias, fileObject] of Object.entries(files)) {
              filenameContentMap.set(
                queryFilenameAliasMap.get(queryAlias) as string,
                fileObject.text,
              )
            }
          }),
      )
    } catch (error) {
      handleHttpErrors(error)
    }
  }
  await Promise.all(requestPromises)

  return createEntriesFromBlobsQueryResponseData(filenameContentMap)
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

  const queryContent = createBlobsContentQuery()

  let response: CacheAxiosResponse | undefined
  try {
    response = await axiosCacheInstance.post(
      API_URL,
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
      API_URL,
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
      API_URL,
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

  return { ref: mutationResult.commit.oid }
}
