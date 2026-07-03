import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/briefs'

export const listBriefs = (params) =>
  USE_MOCKS
    ? mock(fx.briefsList)
    : client.get('/briefs', { params }).then((r) => r.data)

export const getBrief = (id) =>
  USE_MOCKS
    ? mock(fx.brief)
    : client.get(`/briefs/${id}`).then((r) => r.data)

export const generateBrief = (body) =>
  USE_MOCKS
    ? mock(fx.generateResult)
    : client.post('/briefs/generate', body).then((r) => r.data)
