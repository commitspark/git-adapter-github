import {
  AxiosCacheInstance,
  buildKeyGenerator,
  setupCache,
} from 'axios-cache-interceptor'
import axios from 'axios'
import { cacheKeyGenerator } from './cache-key-generator.ts'

export const QUERY_CACHE_SECONDS = 10 * 60

export const createAxiosCachedInstance = (): AxiosCacheInstance => {
  return setupCache(axios.create(), {
    ttl: QUERY_CACHE_SECONDS * 1000, // milliseconds
    methods: ['get', 'post'],
    generateKey: buildKeyGenerator(cacheKeyGenerator), //
  })
}
