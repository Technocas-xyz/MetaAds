import client from './transport'

export const getSpendRate = () => client.get('/spend-rate').then((r) => r.data)
export const setSpendRate = (rate) => client.put('/spend-rate', { rate }).then((r) => r.data)
