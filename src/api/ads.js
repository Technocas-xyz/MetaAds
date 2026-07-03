import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/ads'

export const listAds = (params) =>
  USE_MOCKS
    ? mock(fx.adsList)
    : client.get('/competitor-ads', { params }).then((r) => r.data)

export const getAd = (id) =>
  USE_MOCKS
    ? mock(fx.adsList.data.find((a) => a.id === String(id)) ?? fx.ad)
    : client.get(`/competitor-ads/${id}`).then((r) => r.data)

export const createAd = (formData) =>
  USE_MOCKS
    ? mock(fx.ad)
    : client
        .post('/competitor-ads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)

export const updateAd = (id, body) =>
  USE_MOCKS
    ? mock({ ...fx.ad, ...body, id })
    : client.put(`/competitor-ads/${id}`, body).then((r) => r.data)

export const getAdsSummary = () =>
  USE_MOCKS
    ? mock(fx.adsSummary)
    : client.get('/competitor-ads/summary').then((r) => r.data)
