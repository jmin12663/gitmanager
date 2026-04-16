import client from './client';

export const getGithubConfig = (projectId) =>
  client.get(`/projects/${projectId}/github`).then(res => res.data.data);

export const saveGithubConfig = (projectId, data) =>
  client.post(`/projects/${projectId}/github`, data).then(res => res.data.data);

export const updateGithubConfig = (projectId, data) =>
  client.put(`/projects/${projectId}/github`, data).then(res => res.data.data);