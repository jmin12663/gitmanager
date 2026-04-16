import client from './client';

export const getDashboard = (projectId) =>
  client.get(`/projects/${projectId}/dashboard`).then(res => res.data.data);