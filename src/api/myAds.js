import client from './transport'

export const getMyBrand = () => client.get('/my-ads/brand').then((r) => r.data)
export const setMyBrand = (data) => client.post('/my-ads/brand', data).then((r) => r.data)
export const triggerMyBrandScrape = () => client.post('/my-ads/scrape').then((r) => r.data)
export const getMyBrandScrapeStatus = () => client.get('/my-ads/scrape-status').then((r) => r.data)
export const getMyAds = (params) => client.get('/my-ads/ads', { params }).then((r) => r.data)
export const getMyAdsStats = () => client.get('/my-ads/stats').then((r) => r.data)
export const triggerMyBrandAnalyze = () => client.post('/my-ads/analyze').then((r) => r.data)
export const getMyBrandAnalyzeStatus = () => client.get('/my-ads/analyze-status').then((r) => r.data)
export const getAdSuggestion = (adId) => client.post(`/my-ads/ads/${adId}/suggest`).then((r) => r.data)
export const getOverallRecommendation = () => client.get('/my-ads/recommendation').then((r) => r.data)
