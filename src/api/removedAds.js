import client from './transport'

export const getRemovedAdsStats = () => client.get('/removed-ads/stats').then((r) => r.data)

export const listRemovedAds = (params) => client.get('/removed-ads', { params }).then((r) => r.data)
