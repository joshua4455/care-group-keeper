export type UserRole = 'admin' | 'leader';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  careGroupId?: string;
  password?: string; // simple demo password stored locally
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  // ISO date string e.g. 1995-06-18
  dob: string;
  careGroupId: string;
}

export interface CareGroup {
  id: string;
  name: string;
  leaderId: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
}

export interface AttendanceRecord {
  id: string;
  date: string;
  memberId: string;
  careGroupId: string;
  status: 'present' | 'absent';
  absenceReason?: string;
}

export interface TransferLog {
  id: string;
  memberId: string;
  fromGroupId: string;
  toGroupId: string;
  reason: string;
  date: string; // ISO date
}

export type FollowUpStatus = 'open' | 'done';

export interface FollowUpTask {
  id: string;
  memberId: string;
  careGroupId: string;
  leaderUserId?: string;
  reason: string;
  status: FollowUpStatus;
  createdAt: string; // ISO date
  completedAt?: string;
}

// Mock data initialization
const STORAGE_KEY = 'careGroupData';

export interface AppData {
  users: User[];
  careGroups: CareGroup[];
  members: Member[];
  attendance: AttendanceRecord[];
  transferLogs?: TransferLog[];
  followUps?: FollowUpTask[];
  absenceReasons?: string[];
}

const defaultData: AppData = {
  users: [
    { id: 'admin1', name: 'Pastor John', role: 'admin', password: 'admin123' },
    { id: 'leader1', name: 'Sarah Johnson', role: 'leader' },
    { id: 'leader2', name: 'Michael Brown', role: 'leader' },
  ],
  careGroups: [
    { id: 'sun', name: 'Sunday Care Group', leaderId: '', day: 'Sunday' },
    { id: 'mon', name: 'Monday Care Group', leaderId: '', day: 'Monday' },
    { id: 'tue', name: 'Tuesday Care Group', leaderId: '', day: 'Tuesday' },
    { id: 'wed', name: 'Wednesday Care Group', leaderId: '', day: 'Wednesday' },
    { id: 'thu', name: 'Thursday Care Group', leaderId: '', day: 'Thursday' },
    { id: 'fri', name: 'Friday Care Group', leaderId: '', day: 'Friday' },
    { id: 'sat', name: 'Saturday Care Group', leaderId: '', day: 'Saturday' },
  ],
  members: [
    { id: 'member1', name: 'Emma Wilson', phone: '555-0101', dob: '1995-06-18', careGroupId: 'sun' },
    { id: 'member2', name: 'James Davis', phone: '555-0102', dob: '1990-03-12', careGroupId: 'mon' },
    { id: 'member3', name: 'Olivia Martinez', phone: '555-0103', dob: '1988-09-13', careGroupId: 'tue' },
    { id: 'member4', name: 'William Garcia', phone: '555-0104', dob: '1992-11-25', careGroupId: 'wed' },
    { id: 'member5', name: 'Sophia Rodriguez', phone: '555-0105', dob: '1999-02-04', careGroupId: 'thu' },
  ],
  attendance: [],
  transferLogs: [],
  followUps: [],
  absenceReasons: [
    'Sick/Health',
    'Travel',
    'Work',
    'Family',
    'School',
  ],
};

export const getStoredData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Simple migrations
      // 1) Ensure careGroups are the 7 weekday groups with 'day' field
      const needsGroupMigration = !Array.isArray(parsed.careGroups) || parsed.careGroups.some((g: any) => !g.day);
      // 2) Ensure members have dob
      const needsMemberDob = !Array.isArray(parsed.members) || parsed.members.some((m: any) => !m.dob);
      // 3) Ensure admin users have a password to avoid login lockout
      if (Array.isArray(parsed.users)) {
        parsed.users = parsed.users.map((u: any) =>
          u.role === 'admin' && !u.password ? { ...u, password: 'admin123' } : u
        );
      }

      // 4) Ensure transferLogs exists
      if (!Array.isArray(parsed.transferLogs)) {
        parsed.transferLogs = [];
      }

      // 5) Ensure followUps exists
      if (!Array.isArray(parsed.followUps)) {
        parsed.followUps = [];
      }

      // 6) Ensure absenceReasons exists with defaults (do not overwrite if present)
      if (!Array.isArray(parsed.absenceReasons)) {
        parsed.absenceReasons = [...defaultData.absenceReasons!];
      }

      if (needsGroupMigration || needsMemberDob) {
        const migrated: AppData = JSON.parse(JSON.stringify(defaultData));
        // Try to keep existing users
        if (Array.isArray(parsed.users)) migrated.users = parsed.users;
        // If old members exist but lack dob, assign today's date as placeholder and auto-assign
        if (Array.isArray(parsed.members)) {
          migrated.members = parsed.members.map((m: any, idx: number) => {
            const dob = m.dob || new Date().toISOString().slice(0, 10);
            // Map existing careGroup names to new ids if possible
            let careGroupId = m.careGroupId;
            const legacyMap: Record<string, string> = {
              group1: 'sun',
              group2: 'mon',
            };
            if (careGroupId && legacyMap[careGroupId]) careGroupId = legacyMap[careGroupId];
            // Recompute by dob if unknown
            if (!careGroupId || !m.dob) {
              const dayIdx = new Date(dob).getDay();
              const ids = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
              careGroupId = ids[dayIdx];
            }
            return { id: m.id || `member${Date.now()}${idx}`, name: m.name, phone: m.phone, dob, careGroupId };
          });
        }
        // Keep attendance if present
        if (Array.isArray(parsed.attendance)) migrated.attendance = parsed.attendance;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return parsed as AppData;
    } catch {
      // Reset to default if corrupted
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return defaultData;
    }
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