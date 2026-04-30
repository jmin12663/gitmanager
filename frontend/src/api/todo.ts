import client from './client'

export const getTodosApi = () =>
  client.get('/todos')

export const createTodoApi = (content: string) =>
  client.post('/todos', { content })

export const toggleTodoApi = (todoId: number) =>
  client.patch(`/todos/${todoId}/toggle`)

export const deleteTodoApi = (todoId: number) =>
  client.delete(`/todos/${todoId}`)