import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/users'

export const listUsers = () =>
  USE_MOCKS
    ? mock(fx.usersList)
    : client.get('/users').then((r) => r.data)

export const createUser = (body) =>
  USE_MOCKS
    ? mock({ ...fx.user, ...body, id: '99' })
    : client.post('/users', body).then((r) => r.data)

export const updateUser = (id, body) =>
  USE_MOCKS
    ? mock({ ...fx.user, ...body, id })
    : client.put(`/users/${id}`, body).then((r) => r.data)

export const deleteUser = (id) =>
  USE_MOCKS
    ? mock({ id, deleted: true })
    : client.delete(`/users/${id}`).then((r) => r.data)
