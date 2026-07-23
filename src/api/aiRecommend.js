import client from './transport'

export const getEngines = () => client.get('/ai-recommend/engines').then((r) => r.data)
export const getContext = () => client.get('/ai-recommend/context').then((r) => r.data)
export const generateComparison = (data) => client.post('/ai-recommend/generate', data).then((r) => r.data)
export const getRunStatus = (id) => client.get(`/ai-recommend/runs/${id}`).then((r) => r.data)
export const cancelRun = (id) => client.post(`/ai-recommend/cancel/${id}`).then((r) => r.data)
export const getHistory = () => client.get('/ai-recommend/history').then((r) => r.data)
export const getHistoryDetail = (id) => client.get(`/ai-recommend/history/${id}`).then((r) => r.data)
