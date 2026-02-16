import { GitHubRepositoryOptions } from '../index.ts'
import { AxiosCacheInstance } from 'axios-cache-interceptor'
import { ErrorCode, GitAdapterError } from '@commitspark/git-adapter'
import { getPathEntryFolder } from '../util/path-factory.ts'
import { handleHttpErrors } from '../errors.ts'
import { GITHUB_REST_API_URL } from '../types.ts'

export const getFilePaths = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  treeSha: string,
): Promise<string[]> => {
  const pathEntryFolder = getPathEntryFolder(gitRepositoryOptions)
  const { repositoryOwner, repositoryName, accessToken } = gitRepositoryOptions

  // hard limit of 100,000 entries and 7MB response size; see https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#get-a-tree
  const restApiUrl =
    GITHUB_REST_API_URL +
    `/repos/${repositoryOwner}/${repositoryName}/git/trees/${treeSha}?recursive=1`

  let response
  try {
    response = await axiosCacheInstance.get(restApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
      timeout: 30000,
    })
  } catch (error) {
    handleHttpErrors(error)
  }

  if (response === undefined) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch repository file list.',
    )
  }

  const data = response.data as GitHubTreeResponse

  if (data.truncated) {
    throw new GitAdapterError(
      ErrorCode.INTERNAL_ERROR,
      `Too many files in repository.`,
    )
  }

  return data.tree
    .filter(
      (entry) =>
        entry.type === 'blob' && entry.path.startsWith(pathEntryFolder),
    )
    .map((entry) => entry.path)
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[]
  truncated: boolean
}

interface GitHubTreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
}
