import { AxiosCacheInstance, CacheAxiosResponse } from 'axios-cache-interceptor'
import { Commit, CommitDraft, Entry } from '@commitspark/git-adapter'
import { GitHubRepositoryOptions } from './index'
import {
  createBlobContentQuery,
  createBlobsContentQuery,
  createCommitMutation,
  createLatestCommitQuery,
} from './util/graphql-query-factory'
import { convertEntriesToActions } from './util/entries-to-actions-converter'
import { getPathEntryFolder, getPathSchema } from './util/path-factory'
import { createEntriesFromBlobsQueryResponseData } from './util/entry-factory'

export const API_URL = 'https://api.github.com/graphql'

export const getEntries = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
): Promise<Entry[]> => {
  const token = gitRepositoryOptions.accessToken
  const pathEntryFolder = getPathEntryFolder(gitRepositoryOptions)

  const queryFilesContent = createBlobsContentQuery()
  const filesContentResponse = await axiosCacheInstance.post(
    API_URL,
    {
      query: queryFilesContent,
      variables: {
        repositoryOwner: gitRepositoryOptions.repositoryOwner,
        repositoryName: gitRepositoryOptions.repositoryName,
        expression: `${commitHash}:${pathEntryFolder}`,
      },
    },
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  )

  if (!filesContentResponse.data.data.repository?.object?.entries) {
    return []
  }

  return createEntriesFromBlobsQueryResponseData(
    filesContentResponse.data.data.repository.object.entries,
  )
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

  const queryContent = createBlobContentQuery()
  const response = await axiosCacheInstance.post(
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
  const schema = response.data?.data?.repository?.object?.text

  if (!schema) {
    throw new Error(
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

  const response = await axiosCacheInstance.post(
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

  if (!response.data.data.repository) {
    throw new Error(
      `No repository found "${gitRepositoryOptions.repositoryOwner}/${gitRepositoryOptions.repositoryName}"`,
    )
  }

  const lastCommit =
    response.data.data.repository.ref?.target?.oid ??
    response.data.data.repository.object?.oid ??
    undefined
  if (!lastCommit) {
    throw new Error(`No commit found for ref "${ref}"`)
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
  const response: CacheAxiosResponse = await axiosCacheInstance.post(
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

  if (response.data.errors) {
    throw new Error(JSON.stringify(response.data.errors))
  }

  const mutationResult = response.data.data.commitCreate

  if (mutationResult.errors) {
    throw new Error(JSON.stringify(mutationResult.errors))
  }

  return { ref: mutationResult.commit.oid }
}
