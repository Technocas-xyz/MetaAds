import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/review'

export const getReviewQueueSummary = ()       => USE_MOCKS ? mock(fx.reviewQueueSummary) : client.get('/review-queue/summary').then((r) => r.data)

export const listReviewQueue = (params) =>
  USE_MOCKS
    ? mock(fx.reviewQueue)
    : client.get('/review-queue', { params }).then((r) => r.data)

export const approveReview  = (id, body) =>
  USE_MOCKS ? mock(fx.approveResult) : client.post(`/review/${id}/approve`, body).then((r) => r.data)

export const updateReview   = (id, body) =>
  USE_MOCKS ? mock(fx.updateResult) : client.post(`/review/${id}/update`, body).then((r) => r.data)

export const bulkApprove    = (ids)  =>
  USE_MOCKS ? mock({ approved: ids.length }) : client.post('/review-queue/bulk-approve', { ids }).then((r) => r.data)

export const bulkRerunAI    = (ids)  =>
  USE_MOCKS ? mock({ queued: ids.length })   : client.post('/review-queue/bulk-rerun', { ids }).then((r) => r.data)

export const bulkReassign   = (ids, userId) =>
  USE_MOCKS ? mock({ reassigned: ids.length }) : client.post('/review-queue/bulk-reassign', { ids, userId }).then((r) => r.data)

export const submitToReview = (id, body) =>
  USE_MOCKS
    ? mock({ id, status: 'in_review' })
    : client.post(`/review/${id}`, body).then((r) => r.data)

export const getReviewItem  = (id) =>
  USE_MOCKS
    ? mock(fx.getReviewItemById(id))
    : client.get(`/review-queue/${id}`).then((r) => r.data)
