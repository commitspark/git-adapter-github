import { GitAdapter, CommitDraft } from '@commitspark/git-adapter'
import { createAxiosCachedInstance } from './axios/cached-instance'
import {
  createCommit,
  getEntries,
  getLatestCommitHash,
  getSchema,
} from './github-adapter'

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
    getEntries: (commitHash: string) =>
      getEntries(gitRepositoryOptions, axiosCacheInstance, commitHash),
    getSchema: (commitHash: string) =>
      getSchema(gitRepositoryOptions, axiosCacheInstance, commitHash),
    getLatestCommitHash: (ref: string) =>
      getLatestCommitHash(gitRepositoryOptions, axiosCacheInstance, ref),
    createCommit: (commitDraft: CommitDraft) =>
      createCommit(gitRepositoryOptions, axiosCacheInstance, commitDraft),
  }
}
