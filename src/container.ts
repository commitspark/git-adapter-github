import { asClass, asFunction, createContainer, InjectionMode } from 'awilix'
import { ContentEntriesToActionsConverterService } from './content-entries-to-actions-converter.service'
import { GitHubAdapterService } from './git-hub-adapter.service'
import { GraphqlQueryFactoryService } from './graphql-query-factory.service'
import axios from 'axios'

const container = createContainer({ injectionMode: InjectionMode.CLASSIC })

container.register({
  httpAdapter: asFunction(() => axios.create()),
  gitLabAdapter: asClass(GitHubAdapterService),

  contentEntriesToActionsConverter: asClass(
    ContentEntriesToActionsConverterService,
  ),
  graphqlQueryFactory: asClass(GraphqlQueryFactoryService),
})

const adapter = container.resolve<GitHubAdapterService>('gitLabAdapter')

export const app = {
  adapter,
  container,
}
