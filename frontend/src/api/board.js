import client from './client';

export const getBoard = (projectId) =>
  client.get(`/projects/${projectId}/board`).then(res => res.data.data);

export const getCard = (projectId, cardId) =>
  client.get(`/projects/${projectId}/cards/${cardId}`).then(res => res.data.data);

export const createCard = (projectId, data) =>
  client.post(`/projects/${projectId}/cards`, data).then(res => res.data.data);

export const updateCard = (projectId, cardId, data) =>
  client.patch(`/projects/${projectId}/cards/${cardId}`, data).then(res => res.data.data);

export const updateCardStatus = (projectId, cardId, status) =>
  client.patch(`/projects/${projectId}/cards/${cardId}/status`, { status }).then(res => res.data);

export const deleteCard = (projectId, cardId) =>
  client.delete(`/projects/${projectId}/cards/${cardId}`).then(res => res.data);

// 백엔드: { branchName, repoName } 둘 다 @NotBlank 필수
export const addBranch = (projectId, cardId, branchName, repoName) =>
  client.post(`/projects/${projectId}/cards/${cardId}/branches`, { branchName, repoName }).then(res => res.data.data);

export const removeBranch = (projectId, cardId, branchName) =>
  client.delete(`/projects/${projectId}/cards/${cardId}/branches/${branchName}`).then(res => res.data);

export const getComments = (projectId, cardId) =>
  client.get(`/projects/${projectId}/cards/${cardId}/comments`).then(res => res.data.data);

export const addComment = (projectId, cardId, content) =>
  client.post(`/projects/${projectId}/cards/${cardId}/comments`, { content }).then(res => res.data.data);

export const deleteComment = (projectId, cardId, commentId) =>
  client.delete(`/projects/${projectId}/cards/${cardId}/comments/${commentId}`).then(res => res.data);