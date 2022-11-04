import { GitAdapter, GitRepositoryOptions } from '@contentlab/git-adapter'
import { app } from './container'

export { GitHubAdapterService } from './git-hub-adapter.service'

export interface GitHubRepositoryOptions extends GitRepositoryOptions {
  repositoryOwner: string
  repositoryName: string
  personalAccessToken: string
}

export function createAdapter(): GitAdapter {
  return app.adapter
}
