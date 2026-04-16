import client from './client';

export const getSchedules = (projectId) =>
  client.get(`/projects/${projectId}/schedules`).then(res => res.data.data);

export const createSchedule = (projectId, data) =>
  client.post(`/projects/${projectId}/schedules`, data).then(res => res.data.data);

export const updateSchedule = (projectId, scheduleId, data) =>
  client.put(`/projects/${projectId}/schedules/${scheduleId}`, data).then(res => res.data.data);

export const deleteSchedule = (projectId, scheduleId) =>
  client.delete(`/projects/${projectId}/schedules/${scheduleId}`).then(res => res.data);