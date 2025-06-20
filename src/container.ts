import { EntriesToActionsConverterService } from './entries-to-actions-converter.service'
import { GitHubAdapterService } from './git-hub-adapter.service'
import { GraphqlQueryFactoryService } from './graphql-query-factory.service'
import axios from 'axios'
import { buildKeyGenerator, setupCache } from 'axios-cache-interceptor'
import { PathFactoryService } from './path-factory.service'
import { EntryFactoryService } from './entry-factory.service'
import { axiosCacheKeyGenerator } from './axios-cache-key-generator'

const cachedHttpAdapter = setupCache(axios.create(), {
  ttl: GitHubAdapterService.QUERY_CACHE_SECONDS * 1000, // milliseconds
  methods: ['get', 'post'],
  generateKey: buildKeyGenerator(axiosCacheKeyGenerator),
})

const graphqlQueryFactoryService = new GraphqlQueryFactoryService()
const entriesToActionsConverterService = new EntriesToActionsConverterService()
const pathFactoryService = new PathFactoryService()
const entryFactoryService = new EntryFactoryService()

export const gitHubAdapterService = new GitHubAdapterService(
  cachedHttpAdapter,
  graphqlQueryFactoryService,
  entriesToActionsConverterService,
  pathFactoryService,
  entryFactoryService,
)
