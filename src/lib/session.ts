export type SessionUser = {
  id: string;
  name: string;
  role: 'admin' | 'leader';
  careGroupId?: string;
};

const KEY = 'cgk_user';

export function getCurrentUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(KEY);
}
