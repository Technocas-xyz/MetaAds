import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/performance'

export const listCreativePerformance = (params) =>
  USE_MOCKS
    ? mock(fx.creativePerformance)
    : client.get('/performance/creatives', { params }).then((r) => r.data)
