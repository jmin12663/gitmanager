import { createContext, useState, useEffect } from 'react';
import { refresh } from '@/api/auth';
import { setAccessToken, clearAccessToken } from '@/api/client';

export const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'gm_user';

function saveUserToStorage(user) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function loadUserFromStorage() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearUserFromStorage() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { userId, name, email }
  const [loading, setLoading] = useState(true); // 앱 초기 로딩 중

  // 앱 첫 로드 — refreshToken 쿠키로 accessToken 복구 시도
  // TokenRefreshResponse는 accessToken만 반환하므로 user 정보는 localStorage에서 복원
  useEffect(() => {
    const storedUser = loadUserFromStorage();
    refresh()
      .then((data) => {
        setAccessToken(data.accessToken);
        setUser(storedUser); // localStorage에 저장된 user 정보 복원
      })
      .catch(() => {
        // refreshToken 없거나 만료 → 비로그인 상태
        clearUserFromStorage();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (data) => {
    // data: { accessToken, userId, name, email }
    const userInfo = { userId: data.userId, name: data.name, email: data.email };
    setAccessToken(data.accessToken);
    setUser(userInfo);
    saveUserToStorage(userInfo); // 새로고침 후 복원을 위해 저장
  };

  const logout = () => {
    clearAccessToken();
    clearUserFromStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}