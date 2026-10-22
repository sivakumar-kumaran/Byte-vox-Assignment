import client from './client';
import axios from 'axios';

export const shareApi = {
  create: (reportId, expiresInDays) =>
    client.post('/share/create', { report_id: reportId, expires_in_days: expiresInDays })
      .then((r) => r.data.link),

  list: (reportId) =>
    client.get(`/share/list/${reportId}`).then((r) => r.data.links),

  listAll: () =>
    client.get('/share/all').then((r) => r.data.links),

  revoke: (linkId) =>
    client.patch(`/share/revoke/${linkId}`).then((r) => r.data),

  // Public — no auth required (client sends no token when not logged in)
  view: (token) =>
    client.get(`/share/${token}`).then((r) => r.data.report),

  computeBlock: (token, block) =>
    client.post(`/share/${token}/compute`, { block }).then((r) => r.data.result),
};
