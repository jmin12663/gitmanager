import client from './client';

export const getProjects = () =>
  client.get('/projects').then(res => res.data.data);

export const getProject = (projectId) =>
  client.get(`/projects/${projectId}`).then(res => res.data.data);

export const createProject = (data) =>
  client.post('/projects', data).then(res => res.data.data);

export const updateProject = (projectId, data) =>
  client.put(`/projects/${projectId}`, data).then(res => res.data.data);

export const deleteProject = (projectId) =>
  client.delete(`/projects/${projectId}`).then(res => res.data);

export const joinProject = (inviteCode) =>
  client.post('/projects/join', { inviteCode }).then(res => res.data.data);

export const leaveProject = (projectId, data) =>
  client.post(`/projects/${projectId}/leave`, data).then(res => res.data);

export const getInviteCode = (projectId) =>
  client.get(`/projects/${projectId}/invite-code`).then(res => res.data.data);

export const regenerateInviteCode = (projectId) =>
  client.post(`/projects/${projectId}/invite-code/regenerate`).then(res => res.data.data);

export const getMembers = (projectId) =>
  client.get(`/projects/${projectId}/members`).then(res => res.data.data);

export const kickMember = (projectId, targetUserId) =>
  client.delete(`/projects/${projectId}/members/${targetUserId}`).then(res => res.data);