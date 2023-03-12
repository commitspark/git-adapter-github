import { asClass, asFunction, createContainer, InjectionMode } from 'awilix'
import { ContentEntriesToActionsConverterService } from './content-entries-to-actions-converter.service'
import { GitHubAdapterService } from './git-hub-adapter.service'
import { GraphqlQueryFactoryService } from './graphql-query-factory.service'
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'

const container = createContainer({ injectionMode: InjectionMode.CLASSIC })

container.register({
  cachedHttpAdapter: asFunction(() =>
    setupCache(axios.create(), {
      ttl: GitHubAdapterService.QUERY_CACHE_SECONDS * 1000, // milliseconds
      methods: ['get', 'post'],
    }),
  ),
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
