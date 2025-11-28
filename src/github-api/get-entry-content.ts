import { AxiosCacheInstance, CacheAxiosResponse } from 'axios-cache-interceptor'
import { GitHubRepositoryOptions } from '../index'
import { createBlobsContentByFilePathsQuery } from './graphql-query-factory'
import { GITHUB_GRAPHQL_API_URL, QUERY_BATCH_SIZE } from '../types'
import { handleGraphQLErrors, handleHttpErrors } from '../errors'

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
    try {
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
            },
          )
          .then((contentResponse) =>
            processContentResponse(
              filePathsContentMap,
              queryFilenameAliasMap,
              contentResponse,
            ),
          ),
      )
    } catch (error) {
      handleHttpErrors(error)
    }
  }
  await Promise.all(requestPromises)

  return filePathsContentMap
}

const processContentResponse = (
  filePathsContentMap: Map<string, string>,
  queryFilenameAliasMap: Map<string, string>,
  contentResponse: CacheAxiosResponse,
): void => {
  handleGraphQLErrors(contentResponse)
  const filesResponseData = contentResponse.data.data.repository as Record<
    string,
    { text: string }
  >

  for (const [queryAlias, fileObject] of Object.entries(filesResponseData)) {
    filePathsContentMap.set(
      queryFilenameAliasMap.get(queryAlias) as string, // we assume we received only those files we know about
      fileObject.text,
    )
  }
}
