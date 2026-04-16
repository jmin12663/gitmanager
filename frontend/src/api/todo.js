import client from './client';

export const getTodos = () =>
  client.get('/todos').then(res => res.data.data);

export const createTodo = (content) =>
  client.post('/todos', { content }).then(res => res.data.data);

// 백엔드에 PUT /todos/{id} 없음 — 수정 기능 미구현 상태
// export const updateTodo = ...

export const toggleTodo = (todoId) =>
  client.patch(`/todos/${todoId}/toggle`).then(res => res.data.data);

export const deleteTodo = (todoId) =>
  client.delete(`/todos/${todoId}`).then(res => res.data);