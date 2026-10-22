import client from './client';

export const reportsApi = {
  list: () => client.get('/reports').then((r) => r.data.reports),
  create: (data) => client.post('/reports', data).then((r) => r.data.report),
  get: (id) => client.get(`/reports/${id}`).then((r) => r.data.report),
  update: (id, data) => client.put(`/reports/${id}`, data).then((r) => r.data.report),
  delete: (id) => client.delete(`/reports/${id}`).then((r) => r.data),
  computeBlock: (id, block) =>
    client.post(`/reports/${id}/compute`, { block }).then((r) => r.data.result),
  exportPDF: (id) =>
    client.get(`/reports/${id}/export/pdf`, { responseType: 'blob' }).then((r) => r.data),
};
