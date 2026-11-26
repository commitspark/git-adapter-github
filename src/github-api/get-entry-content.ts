import { AxiosCacheInstance, CacheAxiosResponse } from 'axios-cache-interceptor'
import { GitHubRepositoryOptions } from '../index.ts'
import { ErrorCode, GitAdapterError } from '@commitspark/git-adapter'
import {
  COMMIT_ALIAS,
  createBlobsContentByFilePathsQuery,
} from './graphql-query-factory.ts'
import { cacheOnlyIf } from '../axios/cached-instance.ts'
import { GITHUB_GRAPHQL_API_URL, QUERY_BATCH_SIZE } from '../types.ts'
import { handleGraphQLErrors, handleHttpErrors } from '../errors.ts'

export const getEntryContent = async (
  gitRepositoryOptions: GitHubRepositoryOptions,
  axiosCacheInstance: AxiosCacheInstance,
  commitHash: string,
  filePaths: string[],
): Promise<Map<string, string>> => {
  const filePathsContentMap = new Map<string, string>()

  const { queries, queryFilenameAliasMap } = createBlobsContentByFilePathsQuery(
    filePaths,
    commitHash,
    QUERY_BATCH_SIZE,
  )

  const requestPromises = []
  for (const contentQuery of queries) {
    requestPromises.push(
      axiosCacheInstance
        .post(
          GITHUB_GRAPHQL_API_URL,
          {
            query: contentQuery,
            variables: {
              repositoryOwner: gitRepositoryOptions.repositoryOwner,
              repositoryName: gitRepositoryOptions.repositoryName,
            },
          },
          {
            headers: {
              authorization: `Bearer ${gitRepositoryOptions.accessToken}`,
            },
            timeout: 30000,
            cache: cacheOnlyIf(
              (response) =>
                response.data?.data?.repository?.[COMMIT_ALIAS] != null,
            ),
          },
        )
        // map only failed requests, so that errors of processing the response are not mapped again
        .catch(handleHttpErrors)
        .then((contentResponse) =>
          processContentResponse(
            filePathsContentMap,
            queryFilenameAliasMap,
            contentResponse,
            commitHash,
          ),
        ),
    )
  }
  await Promise.all(requestPromises)

  return filePathsContentMap
}

const processContentResponse = (
  filePathsContentMap: Map<string, string>,
  queryFilenameAliasMap: Map<string, string>,
  contentResponse: CacheAxiosResponse,
  commitHash: string,
): void => {
  handleGraphQLErrors(contentResponse)
  const { [COMMIT_ALIAS]: commit, ...filesResponseData } = contentResponse.data
    .data.repository as Record<string, { text: string } | null>
  if (!commit) {
    throw new GitAdapterError(
      ErrorCode.NOT_FOUND,
      `Commit "${commitHash}" not found`,
    )
  }

  for (const [queryAlias, fileObject] of Object.entries(filesResponseData)) {
    if (fileObject === null) {
      // requested file does not exist at this commit
      continue
    }
    filePathsContentMap.set(
      queryFilenameAliasMap.get(queryAlias) as string, // we assume we received only those files we know about
      fileObject.text,
    )
  }
}
