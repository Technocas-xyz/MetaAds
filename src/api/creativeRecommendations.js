import client from './transport'

export const getMarketContext = () => client.get('/creative-recommendations/context').then((r) => r.data)
export const generateDirections = (data) => client.post('/creative-recommendations/generate', data || {}).then((r) => r.data)
export const getGenerationResult = (runId) => client.get(`/creative-recommendations/generate/${runId}`).then((r) => r.data)
export const getCachedGeneration = () => client.get('/creative-recommendations/cached').then((r) => r.data)
