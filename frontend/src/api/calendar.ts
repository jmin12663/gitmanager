import client from './client'

export const getSchedulesApi = (projectId: number, from: string, to: string) =>
  client.get(`/projects/${projectId}/schedules`, { params: { from, to } })

export const createScheduleApi = (projectId: number, body: { title: string; startDate: string; endDate: string }) =>
  client.post(`/projects/${projectId}/schedules`, body)

export const updateScheduleApi = (projectId: number, scheduleId: number, body: { title: string; startDate: string; endDate: string }) =>
  client.patch(`/projects/${projectId}/schedules/${scheduleId}`, body)

export const deleteScheduleApi = (projectId: number, scheduleId: number) =>
  client.delete(`/projects/${projectId}/schedules/${scheduleId}`)