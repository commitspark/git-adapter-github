import { AxiosCacheInstance, CacheAxiosResponse } from 'axios-cache-interceptor'
import {
  Commit,
  CommitDraft,
  Entry,
  EntryHash,
  ErrorCode,
  GitAdapterError,
  isHiddenPath,
  validateEntryId,
} from '@commitspark/git-adapter'
import { GitHubRepositoryOptions } from './index.ts'
import {
  createSingleBlobContentQuery,
  createCommitMutation,
  createLatestCommitQuery,
} from './github-api/graphql-query-factory.ts'
import { convertEntriesToActions } from './util/entries-to-actions-converter.ts'
import { AdditionModel } from './model/addition.model.ts'
import {
  getEntryIdFromPath,
  getPathEntry,
  getPathEntryFolder,
  getPathSchema,
} from './util/path-factory.ts'
import { createEntriesFromFileContent } from './util/entry-factory.ts'
import { handleGraphQLErrors, handleHttpErrors } from './errors.ts'
import { getEntryContent } from './github-api/get-entry-content.ts'
import { getFileHashes } from './github-api/get-file-hashes.ts'
import { cacheOnlyIf } from './axios/cached-instance.ts'
import { ENTRY_EXTENSION, GITHUB_GRAPHQL_API_URL } from './types.ts'

export const getEntryHashes = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
): Promise<EntryHash[]> => {
  const fileHashes = await getFileHashes(
    gitRepositoryOptions,
    axiosCacheInstance,
    commitHash,
  )

  const pathEntryFolder = getPathEntryFolder(gitRepositoryOptions)
  return fileHashes
    .filter(
      (fileHash) =>
        fileHash.path.endsWith(ENTRY_EXTENSION) &&
        !isHiddenPath(fileHash.path.substring(pathEntryFolder.length)),
    )
    .map((fileHash) => ({
      id: getEntryIdFromPath(gitRepositoryOptions, fileHash.path),
      hash: fileHash.hash,
    }))
}

export const getEntriesByIds = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
  ids: string[],
): Promise<Entry[]> => {
  ids.forEach(validateEntryId)
  if (ids.length === 0) {
    return []
  }

  const filePathsContentMap = await getEntryContent(
    gitRepositoryOptions,
    axiosCacheInstance,
    commitHash,
    ids.map((id) => getPathEntry(gitRepositoryOptions, id)),
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
          commitHash: commitHash,
          expression: `${commitHash}:${schemaFilePath}`,
        },
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
        // a missing commit may be pushed later
        cache: cacheOnlyIf(
          (response) =>
            response.data?.data?.repository?.commit?.oid !== undefined,
        ),
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

  const repository = response.data?.data?.repository
  // an object that is no commit, e.g. a tree, yields an empty object without `oid`
  if (!repository?.commit?.oid) {
    throw new GitAdapterError(
      ErrorCode.NOT_FOUND,
      `Commit "${commitHash}" not found in Git repository "${repositoryOwner}/${repositoryName}"`,
    )
  }

  const schema = repository.object?.text
  if (schema === undefined || schema === null) {
    throw new GitAdapterError(
      ErrorCode.BAD_REPOSITORY_DATA,
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
          branchRef: `refs/heads/${ref}`,
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

  // a branch takes precedence over a tag of the same name, as GitHub does not document its precedence
  //
  // an annotated tag points to a tag object, which points to the commit; refs and expressions that do not lead to a
  // commit yield no `oid`, as only commits are selected
  const repository = response.data.data.repository
  const lastCommit =
    repository.branch?.target?.oid ??
    repository.ref?.target?.oid ??
    repository.ref?.target?.target?.oid ??
    repository.object?.oid ??
    undefined
  if (!lastCommit) {
    throw new GitAdapterError(
      ErrorCode.NOT_FOUND,
      `No commit found for ref "${ref}"`,
    )
  }

  return lastCommit
}

/**
 * Commits the entry drafts with GitHub's `createCommitOnBranch` mutation, passing `parentSha` as `expectedHeadOid`.
 * GitHub only moves the branch if it still points to that commit and otherwise fails with error type `STALE_DATA`,
 * which is mapped to `CONFLICT`. This atomic check satisfies the commit precondition of the adapter interface, so that
 * callers can repeat their validation against the new branch head instead of overwriting changes they have not seen.
 */
export const createCommit = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitDraft: CommitDraft,
): Promise<Commit> => {
  commitDraft.entries.forEach((entryDraft) => validateEntryId(entryDraft.id))
  const token = gitRepositoryOptions.accessToken
  const pathEntryFolder = getPathEntryFolder(gitRepositoryOptions)

  const { additions, deletions } = convertEntriesToActions(
    commitDraft.entries,
    pathEntryFolder,
  )
  if (commitDraft.schema !== undefined) {
    additions.push(
      new AdditionModel(
        getPathSchema(gitRepositoryOptions),
        commitDraft.schema,
      ),
    )
  }

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
          commitHeadline: commitDraft.message,
          commitBody: commitDraft.body ?? null,
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

  // `createCommitOnBranch` reports failures such as a moved branch as GraphQL errors handled above
  const commitHash: string | undefined =
    response.data.data?.commitCreate?.commit?.oid
  if (!commitHash) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      `Failed to create commit: ${JSON.stringify(response.data)}`,
    )
  }

  return { commitHash: commitHash }
}
