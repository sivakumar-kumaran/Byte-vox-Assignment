import client from './client';

export const datasetsApi = {
  list: () => client.get('/datasets').then((r) => r.data.datasets),
  upload: (formData) => client.post('/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.dataset),
  get: (id) => client.get(`/datasets/${id}`).then((r) => r.data.dataset),
  delete: (id) => client.delete(`/datasets/${id}`).then((r) => r.data),
};
