import { apiClient } from "@renderer/lib/api-fetch"
import { create, keyResolver, windowScheduler } from "@yornaath/batshit"

import { useFeedStore } from "../feed"
import { useSubscriptionStore } from "../subscription"
import { useEntryStore } from "./store"
import type { EntryFilter } from "./types"

type EntryId = string
type FeedId = string

export const getFilteredFeedIds = (feedIds: string[], filter?: EntryFilter) => {
  const state = useEntryStore.getState()
  const ids = [] as string[]
  for (const feedId of feedIds) {
    const entries = state.entries[feedId] || []

    ids.push(...entries)
  }

  if (filter?.unread) {
    const result = [] as string[]
    for (const entryId of ids) {
      const entry = state.flatMapEntries[entryId]
      if (!entry?.read) {
        result.push(entryId)
      }
    }
    return result
  }
  return ids
}

const unread = create({
  fetcher: async (ids: [FeedId, EntryId][]) => {
    await apiClient.reads.$post({ json: { entryIds: ids.map((i) => i[1]) } })

    return []
  },
  resolver: keyResolver("id"),
  scheduler: windowScheduler(1000),
})
/**
 * Only call in store action
 * @internal
 */
export const internal_batchMarkRead = (...args: Parameters<typeof unread.fetch>) => unread.fetch.apply(null, args)

export const getEntryIsInView = (entryId: string) => {
  const state = useEntryStore.getState()
  const entry = state.flatMapEntries[entryId]
  if (!entry) return
  const { feedId } = entry
  const feed = useFeedStore.getState().feeds[feedId]
  if (!feed?.id) return
  const subscription = useSubscriptionStore.getState().data[feed.id]
  if (!subscription) return
  return subscription.view
}
