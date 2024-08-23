import { GitAdapter, GitRepositoryOptions } from '@commitspark/git-adapter'
import { gitHubAdapterService } from './container'

export { GitHubAdapterService } from './git-hub-adapter.service'

export interface GitHubRepositoryOptions extends GitRepositoryOptions {
  repositoryOwner: string
  repositoryName: string
  accessToken: string
  pathSchemaFile?: string
  pathEntryFolder?: string
}

export function createAdapter(): GitAdapter {
  return gitHubAdapterService
}
