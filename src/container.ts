import { ContentEntriesToActionsConverterService } from './content-entries-to-actions-converter.service'
import { GitHubAdapterService } from './git-hub-adapter.service'
import { GraphqlQueryFactoryService } from './graphql-query-factory.service'
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { PathFactoryService } from './path-factory.service'
import { ContentEntryFactoryService } from './content-entry-factory.service'

const cachedHttpAdapter = setupCache(axios.create(), {
  ttl: GitHubAdapterService.QUERY_CACHE_SECONDS * 1000, // milliseconds
  methods: ['get', 'post'],
})

const graphqlQueryFactoryService = new GraphqlQueryFactoryService()
const contentEntriesToActionsConverterService =
  new ContentEntriesToActionsConverterService()
const pathFactoryService = new PathFactoryService()
const contentEntryFactoryService = new ContentEntryFactoryService()

export const gitHubAdapterService = new GitHubAdapterService(
  cachedHttpAdapter,
  graphqlQueryFactoryService,
  contentEntriesToActionsConverterService,
  pathFactoryService,
  contentEntryFactoryService,
)
