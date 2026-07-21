import client from './transport'

export const getFbStatus = () => client.get('/facebook/status').then((r) => r.data)
export const getFbFields = () => client.get('/facebook/ads/fields').then((r) => r.data)
export const getFbAds = (params) => client.get('/facebook/ads', { params }).then((r) => r.data)
