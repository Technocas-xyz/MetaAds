import client from './transport'

export const uploadCreative = (formData) =>
  client.post('/creative-reviews/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)

export const analyzeCreative = (reviewId) =>
  client.post(`/creative-reviews/${reviewId}/analyze`).then((r) => r.data)

export const getReview = (reviewId) =>
  client.get(`/creative-reviews/${reviewId}`).then((r) => r.data)

export const listReviews = () =>
  client.get('/creative-reviews').then((r) => r.data)

export const approveCreative = (reviewId) =>
  client.post(`/creative-reviews/${reviewId}/approve`).then((r) => r.data)

export const requestRevision = (reviewId, reason) =>
  client.post(`/creative-reviews/${reviewId}/request-revision`, { reason }).then((r) => r.data)
