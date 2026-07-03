import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/settings'

export const getSettings = () =>
  USE_MOCKS
    ? mock(fx.settings)
    : client.get('/settings').then((r) => r.data)

export const updateSettings = (body) =>
  USE_MOCKS
    ? mock({ ...fx.settings, ...body })
    : client.put('/settings', body).then((r) => r.data)
