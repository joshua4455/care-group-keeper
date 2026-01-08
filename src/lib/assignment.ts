import { AppData, Member } from './mockData';

export type DayName = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export const dayIds: Record<DayName, string> = {
  Sunday: 'sun',
  Monday: 'mon',
  Tuesday: 'tue',
  Wednesday: 'wed',
  Thursday: 'thu',
  Friday: 'fri',
  Saturday: 'sat',
};

export const idToDay: Record<string, DayName> = Object.fromEntries(
  Object.entries(dayIds).map(([k, v]) => [v, k as DayName])
) as Record<string, DayName>;

export function getDayNameFromDob(dob: string): DayName {
  const d = new Date(dob);
  const idx = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const days: DayName[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[idx];
}

export function getGroupIdForDay(day: DayName): string {
  return dayIds[day];
}

export function assignMemberGroupByDob(member: Omit<Member, 'careGroupId'>): Member {
  const day = getDayNameFromDob(member.dob);
  const careGroupId = getGroupIdForDay(day);
  return { ...member, careGroupId };
}

export function setLeaderForGroup(data: AppData, groupId: string, leaderId: string | ''): AppData {
  const updated = { ...data, users: [...data.users], careGroups: [...data.careGroups] };

  // Clear previous group's leader if the selected leader was leading another group
  if (leaderId) {
    updated.careGroups = updated.careGroups.map(g =>
      g.leaderId === leaderId ? { ...g, leaderId: '' } : g
    );
  }

  // Update group's leader
  updated.careGroups = updated.careGroups.map(g =>
    g.id === groupId ? { ...g, leaderId: leaderId || '' } : g
  );

  // Update users' careGroupId for the selected leader
  updated.users = updated.users.map(u => {
    if (u.role !== 'leader') return u;
    if (u.id === leaderId) {
      return { ...u, careGroupId: leaderId ? groupId : undefined };
    }
    // If this user previously led this group but is not the new leader, clear mapping
    if (u.careGroupId === groupId && u.id !== leaderId) {
      return { ...u, careGroupId: undefined };
    }
    return u;
  });

  return updated;
}

// Same as promoteMemberToLeader, but also generate a password if needed and return it
export function promoteMemberToLeaderWithPassword(
  data: AppData,
  groupId: string,
  memberId: string
): { updated: AppData; password?: string } {
  const updated: AppData = { ...data, users: [...data.users], careGroups: [...data.careGroups] };
  const member = updated.members.find(m => m.id === memberId);
  if (!member) return { updated: data };

  const leaderUserId = `leader-${member.id}`;
  const existingUserIndex = updated.users.findIndex(u => u.id === leaderUserId);
  let password: string | undefined;
  const gen = () => Math.random().toString(36).slice(-10);

  if (existingUserIndex >= 0) {
    const existing = updated.users[existingUserIndex] as any;
    if (!existing.password) {
      password = gen();
    }
    updated.users[existingUserIndex] = {
      ...existing,
      name: member.name,
      role: 'leader',
      careGroupId: groupId,
      password: existing.password || password,
    } as any;
  } else {
    password = gen();
    updated.users.push({ id: leaderUserId, name: member.name, role: 'leader', careGroupId: groupId, password } as any);
  }

  // Clear any group that previously had this leader user
  updated.careGroups = updated.careGroups.map(g => g.leaderId === leaderUserId ? { ...g, leaderId: '' } : g);

  // Assign as group's leader
  updated.careGroups = updated.careGroups.map(g => g.id === groupId ? { ...g, leaderId: leaderUserId } : g);

  return { updated, password };
}

// Create or update a leader user based on a member selection and assign to group
export function promoteMemberToLeader(data: AppData, groupId: string, memberId: string): AppData {
  const updated: AppData = { ...data, users: [...data.users], careGroups: [...data.careGroups] };
  const member = updated.members.find(m => m.id === memberId);
  if (!member) return data;

  const leaderUserId = `leader-${member.id}`;
  const existingUserIndex = updated.users.findIndex(u => u.id === leaderUserId);
  if (existingUserIndex >= 0) {
    updated.users[existingUserIndex] = { ...updated.users[existingUserIndex], name: member.name, role: 'leader', careGroupId: groupId } as any;
  } else {
    updated.users.push({ id: leaderUserId, name: member.name, role: 'leader', careGroupId: groupId } as any);
  }

  // Clear any group that previously had this leader user
  updated.careGroups = updated.careGroups.map(g => g.leaderId === leaderUserId ? { ...g, leaderId: '' } : g);

  // Assign as group's leader
  updated.careGroups = updated.careGroups.map(g => g.id === groupId ? { ...g, leaderId: leaderUserId } : g);

  return updated;
}

export function clearGroupLeader(data: AppData, groupId: string): AppData {
  const updated: AppData = { ...data, users: [...data.users], careGroups: [...data.careGroups] };
  const grp = updated.careGroups.find(g => g.id === groupId);
  if (!grp) return data;
  const currentLeaderId = grp.leaderId;
  updated.careGroups = updated.careGroups.map(g => g.id === groupId ? { ...g, leaderId: '' } : g);
  // Optionally, clear the user's careGroupId
  if (currentLeaderId) {
    updated.users = updated.users.map(u => u.id === currentLeaderId ? { ...u, careGroupId: undefined } : u);
  }
  return updated;
}
