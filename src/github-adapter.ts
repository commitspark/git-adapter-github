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
  createBlobsContentQuery,
  createBlobIdsQuery,
  createBlobsContentByIdsQuery,
  createCommitMutation,
  createLatestCommitQuery,
} from './util/graphql-query-factory'
import { convertEntriesToActions } from './util/entries-to-actions-converter'
import { getPathEntryFolder, getPathSchema } from './util/path-factory'
import { createEntriesFromBlobsQueryResponseData } from './util/entry-factory'
import { handleHttpErrors, handleGraphQLErrors } from './errors'

export const API_URL = 'https://api.github.com/graphql'

export const getEntries = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
): Promise<Entry[]> => {
  const token = gitRepositoryOptions.accessToken
  const pathEntryFolder = getPathEntryFolder(gitRepositoryOptions)

  // 1. Fetch Tree Entries (Metadata only: IDs and Names)
  const queryBlobIds = createBlobIdsQuery()

  let blobIdsResponse: CacheAxiosResponse | undefined
  try {
    blobIdsResponse = await axiosCacheInstance.post(
      API_URL,
      {
        query: queryBlobIds,
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
  } catch (error) {
    handleHttpErrors(error)
  }

  if (!blobIdsResponse) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch GitHub blob IDs that allow querying entry data',
    )
  }

  handleGraphQLErrors(blobIdsResponse)

  const blobData = blobIdsResponse.data.data.repository?.object?.entries

  if (!blobData || !Array.isArray(blobData)) {
    return []
  }

  const entries = blobData.filter(
    (entry) =>
      entry.object && entry.object.__typename === 'Blob' && entry.object.id,
  )

  // 2. Collect Blob IDs for batch fetching
  const blobIds: string[] = entries.map((entry) => entry.object.id)
  // for (const entry of entries) {
  //   if (entry.object && entry.object.__typename === 'Blob' && entry.object.id) {
  //     blobIds.push(entry.object.id)
  //   }
  // }
  console.log('ids: ', blobIds)

  // 3. Fetch Content in Batches (Pagination)
  const BATCH_SIZE = 100 // GitHub's node limit
  const blobContentMap = new Map<string, string | null>()

  const queryContent = createBlobsContentByIdsQuery()
  const requestPromises = []
  for (let i = 0; i < blobIds.length; i += BATCH_SIZE) {
    const batchIds = blobIds.slice(i, i + BATCH_SIZE)

    let contentResponse: CacheAxiosResponse | undefined
    try {
      requestPromises.push(
        axiosCacheInstance
          .post(
            API_URL,
            {
              query: queryContent,
              variables: {
                ids: batchIds,
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
            const nodes = contentResponse.data.data.nodes
            if (nodes) {
              nodes.forEach((node: any) => {
                if (node && node.id) {
                  blobContentMap.set(node.id, node.text)
                }
              })
            }
          }),
      )
    } catch (error) {
      handleHttpErrors(error)
    }
  }
  await Promise.all(requestPromises)

  // 4. Merge content back into entries structure
  for (const entry of entries) {
    entry.object.text = blobContentMap.get(entry.object.id)
  }

  return createEntriesFromBlobsQueryResponseData(entries)
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
