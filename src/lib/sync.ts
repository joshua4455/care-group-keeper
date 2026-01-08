import { AppData, AttendanceRecord, FollowUpTask, getStoredData, saveData } from './mockData';

export type PendingAction =
  | {
      type: 'attendance_save';
      payload: {
        date: string; // yyyy-MM-dd
        careGroupId: string;
        records: Array<{
          memberId: string;
          status: 'present' | 'absent';
          absenceReason?: string;
        }>;
      };
    }
  | {
      type: 'member_update';
      payload: {
        id: string;
        name: string;
        phone: string;
        dob: string;
      };
    }
  | {
      type: 'member_transfer';
      payload: {
        id: string;
        fromGroupId: string;
        toGroupId: string;
        reason: string;
        date: string; // yyyy-MM-dd
      };
    };

const QUEUE_KEY = 'pendingQueue';

function readQueue(): PendingAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingAction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: PendingAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function getPendingCount(): number {
  return readQueue().length;
}

export function queueAction(action: PendingAction) {
  const q = readQueue();
  q.push(action);
  writeQueue(q);
}

function createFollowUpsIfNeeded(data: AppData, careGroupId: string) {
  const leaderUserId = data.careGroups.find(g => g.id === careGroupId)?.leaderId;
  const membersInGroup = data.members.filter(m => m.careGroupId === careGroupId);
  membersInGroup.forEach(m => {
    const recs = data.attendance
      .filter(a => a.memberId === m.id)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (recs.length >= 2) {
      const lastTwo = recs.slice(0,2);
      if (lastTwo.every(r => r.status === 'absent')) {
        const alreadyOpen = (data.followUps || []).some(f => f.memberId === m.id && f.status === 'open');
        if (!alreadyOpen) {
          const reason = lastTwo[0].absenceReason || 'Repeated absence';
          const task: FollowUpTask = {
            id: `fu${Date.now()}${Math.random()}`,
            memberId: m.id,
            careGroupId,
            leaderUserId,
            reason,
            status: 'open',
            createdAt: new Date().toISOString(),
          };
          data.followUps = [...(data.followUps || []), task];
        }
      }
    }
  });
}

function applyAttendanceSave(data: AppData, payload: PendingAction & { type: 'attendance_save' }) {
  const { date, careGroupId, records } = payload.payload;
  // remove existing for date+group
  data.attendance = data.attendance.filter(a => !(a.date === date && a.careGroupId === careGroupId));
  // add new
  records.forEach(r => {
    data.attendance.push({
      id: `att${Date.now()}${Math.random()}`,
      date,
      memberId: r.memberId,
      careGroupId,
      status: r.status,
      absenceReason: r.status === 'absent' ? r.absenceReason : undefined,
    });
  });
  // immediate follow-up for 'sick' reasons
  const leaderUserId = data.careGroups.find(g => g.id === careGroupId)?.leaderId;
  records.filter(r => r.status === 'absent' && (r.absenceReason || '').toLowerCase().includes('sick')).forEach(r => {
    const alreadyOpen = (data.followUps || []).some(f => f.memberId === r.memberId && f.status === 'open');
    if (!alreadyOpen) {
      const task = {
        id: `fu${Date.now()}${Math.random()}`,
        memberId: r.memberId,
        careGroupId,
        leaderUserId,
        reason: r.absenceReason || 'Sick/Health',
        status: 'open' as const,
        createdAt: new Date().toISOString(),
      };
      data.followUps = [...(data.followUps || []), task];
    }
  });
  createFollowUpsIfNeeded(data, careGroupId);
}

function applyMemberUpdate(data: AppData, payload: PendingAction & { type: 'member_update' }) {
  const { id, name, phone, dob } = payload.payload;
  data.members = data.members.map(m => m.id === id ? { ...m, name, phone, dob } : m);
}

function applyMemberTransfer(data: AppData, payload: PendingAction & { type: 'member_transfer' }) {
  const { id, fromGroupId, toGroupId, reason, date } = payload.payload;
  data.members = data.members.map(m => m.id === id ? { ...m, careGroupId: toGroupId } : m);
  data.transferLogs = [
    ...((data.transferLogs) || []),
    {
      id: `tx${Date.now()}${Math.random()}`,
      memberId: id,
      fromGroupId,
      toGroupId,
      reason,
      date,
    },
  ];
}

export async function processQueue(): Promise<{ processed: number }> {
  if (!navigator.onLine) return { processed: 0 };
  let q = readQueue();
  if (q.length === 0) return { processed: 0 };
  const data = getStoredData();
  let processed = 0;
  for (const action of q) {
    try {
      switch (action.type) {
        case 'attendance_save':
          applyAttendanceSave(data, action);
          processed++;
          break;
        case 'member_update':
          applyMemberUpdate(data, action);
          processed++;
          break;
        case 'member_transfer':
          applyMemberTransfer(data, action);
          processed++;
          break;
        default:
          break;
      }
    } catch {
      // keep action in queue if failed
    }
  }
  // clear queue after successful apply
  writeQueue([]);
  saveData(data);
  return { processed };
}
