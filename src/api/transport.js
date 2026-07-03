import client from './client'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))
export const mock = (data) => delay().then(() => data)

export default client
