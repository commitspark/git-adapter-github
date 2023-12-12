import { GraphqlQueryFactoryService } from './graphql-query-factory.service'
import {
  Commit,
  CommitDraft,
  ContentEntry,
  GitAdapter,
} from '@commitspark/git-adapter'
import { ContentEntriesToActionsConverterService } from './content-entries-to-actions-converter.service'
import { AxiosCacheInstance } from 'axios-cache-interceptor'
import { GitHubRepositoryOptions } from './index'
import { PathFactoryService } from './path-factory.service'
import { ContentEntryFactoryService } from './content-entry-factory.service'

export class GitHubAdapterService implements GitAdapter {
  static readonly QUERY_CACHE_SECONDS = 10 * 60

  static readonly API_URL = 'https://api.github.com/graphql'

  private gitRepositoryOptions: GitHubRepositoryOptions | undefined

  constructor(
    private readonly cachedHttpAdapter: AxiosCacheInstance,
    private graphqlQueryFactory: GraphqlQueryFactoryService,
    private contentEntriesToActionsConverter: ContentEntriesToActionsConverterService,
    private pathFactory: PathFactoryService,
    private contentEntryFactory: ContentEntryFactoryService,
  ) {}

  public async setRepositoryOptions(
    repositoryOptions: GitHubRepositoryOptions,
  ): Promise<void> {
    this.gitRepositoryOptions = repositoryOptions
  }

  public async getContentEntries(commitHash: string): Promise<ContentEntry[]> {
    if (this.gitRepositoryOptions === undefined) {
      throw new Error('Repository options must be set before reading')
    }

    const token = this.gitRepositoryOptions.personalAccessToken
    const pathEntryFolder = this.pathFactory.getPathEntryFolder(
      this.gitRepositoryOptions,
    )

    const queryFilesContent = this.graphqlQueryFactory.createBlobsContentQuery()
    const filesContentResponse = await this.cachedHttpAdapter.post(
      GitHubAdapterService.API_URL,
      {
        query: queryFilesContent,
        variables: {
          repositoryOwner: this.gitRepositoryOptions.repositoryOwner,
          repositoryName: this.gitRepositoryOptions.repositoryName,
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

    return this.contentEntryFactory.createFromBlobsQueryResponseData(
      filesContentResponse.data.data.repository.object.entries,
    )
  }

  public async getSchema(commitHash: string): Promise<string> {
    if (this.gitRepositoryOptions === undefined) {
      throw new Error('Repository options must be set before reading')
    }

    const repositoryOwner = this.gitRepositoryOptions.repositoryOwner
    const repositoryName = this.gitRepositoryOptions.repositoryName
    const token = this.gitRepositoryOptions.personalAccessToken
    const schemaFilePath = this.pathFactory.getPathSchema(
      this.gitRepositoryOptions,
    )

    const queryContent = this.graphqlQueryFactory.createBlobContentQuery()
    const response = await this.cachedHttpAdapter.post(
      GitHubAdapterService.API_URL,
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

  public async getLatestCommitHash(ref: string): Promise<string> {
    if (this.gitRepositoryOptions === undefined) {
      throw new Error('Repository options must be set before reading')
    }

    const token = this.gitRepositoryOptions.personalAccessToken

    const queryLatestCommit = this.graphqlQueryFactory.createLatestCommitQuery()

    const response = await this.cachedHttpAdapter.post(
      GitHubAdapterService.API_URL,
      {
        query: queryLatestCommit,
        variables: {
          repositoryOwner: this.gitRepositoryOptions.repositoryOwner,
          repositoryName: this.gitRepositoryOptions.repositoryName,
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
        `No repository found "${this.gitRepositoryOptions.repositoryOwner}/${this.gitRepositoryOptions.repositoryName}"`,
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

  public async createCommit(commitDraft: CommitDraft): Promise<Commit> {
    if (this.gitRepositoryOptions === undefined) {
      throw new Error('Repository options must be set before committing')
    }

    const token = this.gitRepositoryOptions.personalAccessToken
    const pathEntryFolder = this.pathFactory.getPathEntryFolder(
      this.gitRepositoryOptions,
    )

    const { additions, deletions } =
      this.contentEntriesToActionsConverter.convert(
        commitDraft.contentEntries,
        pathEntryFolder,
      )

    const mutateCommit = this.graphqlQueryFactory.createCommitMutation()
    const response: any = await this.cachedHttpAdapter.post(
      GitHubAdapterService.API_URL,
      {
        query: mutateCommit,
        variables: {
          repositoryNameWithOwner: `${this.gitRepositoryOptions.repositoryOwner}/${this.gitRepositoryOptions.repositoryName}`,
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
}
