export type UserRole = 'admin' | 'leader';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  careGroupId?: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  careGroupId: string;
}

export interface CareGroup {
  id: string;
  name: string;
  meetingDay: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  leaderId: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  memberId: string;
  careGroupId: string;
  status: 'present' | 'absent';
  absenceReason?: string;
}

// Mock data initialization
const STORAGE_KEY = 'careGroupData';

export interface AppData {
  users: User[];
  careGroups: CareGroup[];
  members: Member[];
  attendance: AttendanceRecord[];
}

const defaultData: AppData = {
  users: [
    { id: 'admin1', name: 'Pastor John', role: 'admin' },
    { id: 'leader1', name: 'Sarah Johnson', role: 'leader', careGroupId: 'group1' },
    { id: 'leader2', name: 'Michael Brown', role: 'leader', careGroupId: 'group2' },
  ],
  careGroups: [
    { id: 'group1', name: 'Wednesday Evening Group', meetingDay: 'Wednesday', leaderId: 'leader1' },
    { id: 'group2', name: 'Sunday Morning Group', meetingDay: 'Sunday', leaderId: 'leader2' },
  ],
  members: [
    { id: 'member1', name: 'Emma Wilson', phone: '555-0101', careGroupId: 'group1' },
    { id: 'member2', name: 'James Davis', phone: '555-0102', careGroupId: 'group1' },
    { id: 'member3', name: 'Olivia Martinez', phone: '555-0103', careGroupId: 'group1' },
    { id: 'member4', name: 'William Garcia', phone: '555-0104', careGroupId: 'group2' },
    { id: 'member5', name: 'Sophia Rodriguez', phone: '555-0105', careGroupId: 'group2' },
  ],
  attendance: [],
};

export const getStoredData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

export const logout = () => {
  localStorage.removeItem('currentUser');
};