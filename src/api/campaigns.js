import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/campaigns'

export const listCampaigns = (params) =>
  USE_MOCKS
    ? mock(fx.campaignsList)
    : client.get('/campaigns', { params }).then((r) => r.data)

export const createCampaign = (body) =>
  USE_MOCKS
    ? mock(fx.createResult)
    : client.post('/campaigns', body).then((r) => r.data)
