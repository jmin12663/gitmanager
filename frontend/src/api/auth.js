import client from './client';

export const register = (data) =>
  client.post('/auth/register', data).then(res => res.data);

// 백엔드: { email, code } — 이메일 + 6자리 인증 코드
export const verifyEmail = (email, code) =>
  client.post('/auth/verify-email', { email, code }).then(res => res.data);

export const login = (data) =>
  client.post('/auth/login', data).then(res => res.data);

export const refresh = () =>
  client.post('/auth/refresh').then(res => res.data.data);

export const logout = () =>
  client.post('/auth/logout').then(res => res.data);