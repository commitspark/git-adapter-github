import { GitAdapter, CommitDraft } from '@commitspark/git-adapter'
import { createAxiosCachedInstance } from './axios/cached-instance.ts'
import {
  createCommit,
  getEntriesByIds,
  getEntryHashes,
  getLatestCommitHash,
  getSchema,
} from './github-adapter.ts'

export interface GitHubRepositoryOptions {
  repositoryOwner: string
  repositoryName: string
  accessToken: string
  pathSchemaFile?: string
  pathEntryFolder?: string
}

export function createAdapter(
  gitRepositoryOptions: GitHubRepositoryOptions,
): GitAdapter {
  const axiosCacheInstance = createAxiosCachedInstance()

  return {
    getEntryHashes: (commitHash: string) =>
      getEntryHashes(gitRepositoryOptions, axiosCacheInstance, commitHash),
    getEntriesByIds: (commitHash: string, ids: string[]) =>
      getEntriesByIds(
        gitRepositoryOptions,
        axiosCacheInstance,
        commitHash,
        ids,
      ),
    getSchema: (commitHash: string) =>
      getSchema(gitRepositoryOptions, axiosCacheInstance, commitHash),
    getLatestCommitHash: (ref: string) =>
      getLatestCommitHash(gitRepositoryOptions, axiosCacheInstance, ref),
    createCommit: (commitDraft: CommitDraft) =>
      createCommit(gitRepositoryOptions, axiosCacheInstance, commitDraft),
  }
}
