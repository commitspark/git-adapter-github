import {
  AxiosCacheInstance,
  buildKeyGenerator,
  CacheAxiosResponse,
  CacheProperties,
  setupCache,
} from 'axios-cache-interceptor'
import axios from 'axios'
import { cacheKeyGenerator } from './cache-key-generator.ts'

const QUERY_CACHE_SECONDS = 10 * 60

export const createAxiosCachedInstance = (): AxiosCacheInstance => {
  return setupCache(axios.create(), {
    ttl: QUERY_CACHE_SECONDS * 1000, // milliseconds
    methods: ['get', 'post'],
    generateKey: buildKeyGenerator(cacheKeyGenerator), //
  })
}

/**
 * Returns request cache properties that cache a successful response only if it matches, e.g. only if the requested
 * commit exists, so that a commit pushed later is not reported as missing from the cache.
 */
export const cacheOnlyIf = (
  responseMatch: (response: CacheAxiosResponse) => boolean,
): Partial<CacheProperties> => ({
  cachePredicate: { responseMatch },
})
