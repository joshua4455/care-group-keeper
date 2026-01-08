import { supabase, USE_SUPABASE } from './supabase'
import { getStoredData, saveData, type AppData, type CareGroup, type Member, type FollowUpTask } from './mockData'

export type AttendanceStatus = 'present' | 'absent'
export interface AttendanceInput {
  date: string
  careGroupId: string
  records: Array<{
    memberId: string
    status: AttendanceStatus
    absenceReason?: string
  }>
}

// ---------- Follow-ups: create if not exists (open) ----------
export async function createFollowUpIfNotExists(memberId: string, careGroupId: string, leaderUserId: string | null, reason: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    const alreadyOpen = (data.followUps || []).some(f => f.memberId === memberId && f.status === 'open')
    if (alreadyOpen) return
    const task = {
      id: `fu${Date.now()}${Math.random()}`,
      memberId,
      careGroupId,
      leaderUserId: leaderUserId || undefined,
      reason,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    }
    data.followUps = [...(data.followUps || []), task]
    saveData(data)
    return
  }
  // check if an open follow-up already exists for this member
  const open = await supabase
    .from('follow_ups')
    .select('id')
    .eq('member_id', memberId)
    .eq('status', 'open')
    .limit(1)
  if (open.error) throw open.error
  if ((open.data || []).length) return

  const { error } = await supabase.from('follow_ups').insert({
    member_id: memberId,
    care_group_id: careGroupId,
    leader_user_id: leaderUserId,
    reason,
    status: 'open',
    created_at: new Date().toISOString(),
  })
  if (error) throw error
}

// ---------- Security helpers ----------
async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && (window.crypto as any)?.subtle) {
    const enc = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest('SHA-256', enc)
    const bytes = Array.from(new Uint8Array(digest))
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // Node or unsupported env fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('crypto') as typeof import('crypto')
  return nodeCrypto.createHash('sha256').update(input).digest('hex')
}

// ---------- Absence Reasons ----------
export async function fetchAbsenceReasons(): Promise<{ id: string; label: string }[]> {
  if (!USE_SUPABASE) {
    // fallback to a default set
    return [
      { id: 'sick', label: 'Sick' },
      { id: 'health', label: 'Health' },
      { id: 'travel', label: 'Travel' },
      { id: 'work', label: 'Work' },
      { id: 'family', label: 'Family' },
      { id: 'other', label: 'Other' },
    ];
  }
  const { data, error } = await supabase
    .from('absence_reasons')
    .select('id,label')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
  if (error) throw error;
  return (data || []) as { id: string; label: string }[];
}

// ---------- Members (writes) ----------
export async function insertMember(input: { name: string; phone?: string; dob?: string; careGroupId: string }) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.members.push({ id: `member${Date.now()}`, name: input.name, phone: input.phone || '', dob: input.dob || '', careGroupId: input.careGroupId } as any)
    saveData(data)
    return
  }
  const { error } = await supabase.rpc('rpc_insert_member', {
    p_name: input.name,
    p_phone: input.phone || null,
    p_dob: input.dob || null,
    p_care_group_id: input.careGroupId,
  })
  if (error) throw error
}

export async function bulkInsertMembers(rows: Array<{ name: string; phone?: string; dob?: string; careGroupId: string }>) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    rows.forEach(r => data.members.push({ id: `member${Date.now()}${Math.random()}`, name: r.name, phone: r.phone || '', dob: r.dob || '', careGroupId: r.careGroupId } as any))
    saveData(data)
    return
  }
  const payload = rows.map(r => ({ name: r.name, phone: r.phone || '', dob: r.dob || '', careGroupId: r.careGroupId }))
  const { error } = await supabase.rpc('rpc_bulk_insert_members', { p_rows: payload })
  if (error) throw error
}

// ---------- Leaders / Groups ----------
export async function createLeaderUser(name: string, careGroupId: string, password: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    const id = `leader${Date.now()}`
    data.users.push({ id, name, role: 'leader', careGroupId, password } as any)
    saveData(data)
    return { id }
  }
  const password_hash = await sha256Hex(password)
  const { data, error } = await supabase.rpc('rpc_create_user', {
    p_name: name,
    p_role: 'leader',
    p_phone: null,
    p_care_group_id: careGroupId,
    p_password_hash: password_hash,
  })
  if (error) throw error
  return { id: data as unknown as string }
}

export async function setCareGroupLeader(groupId: string, leaderUserId: string | null) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.careGroups = data.careGroups.map(g => g.id === groupId ? { ...g, leaderId: leaderUserId || undefined } as any : g)
    saveData(data)
    return
  }
  const { error } = await supabase.rpc('rpc_set_group_leader', { p_group_id: groupId, p_leader_user_id: leaderUserId })
  if (error) throw error
}

export async function updateUserPassword(userId: string, newPassword: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.users = data.users.map(u => u.id === userId ? { ...u, password: newPassword } as any : u)
    saveData(data)
    return
  }
  const password_hash = await sha256Hex(newPassword)
  const { error } = await supabase.rpc('rpc_update_user_password', { p_user_id: userId, p_password_hash: password_hash })
  if (error) throw error
}

// ---------- Care Groups ----------
export async function fetchCareGroups(): Promise<CareGroup[]> {
  if (!USE_SUPABASE) return getStoredData().careGroups
  const { data, error } = await supabase.from('care_groups').select('*').order('name', { ascending: true })
  if (error) throw error
  return data as unknown as CareGroup[]
}

// ---------- Members ----------
export async function fetchMembersByGroup(careGroupId: string): Promise<Member[]> {
  if (!USE_SUPABASE) return getStoredData().members.filter(m => m.careGroupId === careGroupId)
  const { data, error } = await supabase.from('members').select('*').eq('care_group_id', careGroupId).order('name')
  if (error) throw error
  return data as unknown as Member[]
}

// ---------- Attendance ----------
export async function upsertAttendance(payload: AttendanceInput): Promise<void> {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.attendance = data.attendance.filter(a => !(a.date === payload.date && a.careGroupId === payload.careGroupId))
    payload.records.forEach(r => {
      data.attendance.push({
        id: `att${Date.now()}${Math.random()}`,
        date: payload.date,
        careGroupId: payload.careGroupId,
        memberId: r.memberId,
        status: r.status,
        absenceReason: r.status === 'absent' ? r.absenceReason : undefined,
      })
    })
    saveData(data)
    return
  }
  const { error } = await supabase.rpc('rpc_upsert_attendance', {
    p_date: payload.date,
    p_care_group_id: payload.careGroupId,
    p_records: payload.records,
  })
  if (error) throw error
}

export async function listAttendanceByDateGroup(date: string, careGroupId: string) {
  if (!USE_SUPABASE) return getStoredData().attendance.filter(a => a.date === date && a.careGroupId === careGroupId)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date)
    .eq('care_group_id', careGroupId)
  if (error) throw error
  return data
}

export async function listAttendanceByDate(date: string) {
  if (!USE_SUPABASE) return getStoredData().attendance.filter(a => a.date === date)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date)
  if (error) throw error
  return data
}

export async function deleteUser(userId: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.users = data.users.filter(u => u.id !== userId)
    saveData(data)
    return
  }
  const { error } = await supabase.rpc('rpc_delete_user', { p_user_id: userId })
  if (error) throw error
}

export async function listLeaders() {
  if (!USE_SUPABASE) return getStoredData().users.filter(u => u.role === 'leader')
  const { data, error } = await supabase.from('users').select('id,name,role,phone,care_group_id').eq('role', 'leader')
  if (error) throw error
  return data
}

export async function fetchUserById(id: string) {
  if (!USE_SUPABASE) return getStoredData().users.find(u => u.id === id)
  const { data, error } = await supabase.from('users').select('id,name,role,phone,care_group_id').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchAllMembers() {
  if (!USE_SUPABASE) return getStoredData().members
  const { data, error } = await supabase.from('members').select('*').order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchAllAttendance() {
  if (!USE_SUPABASE) return getStoredData().attendance
  const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false })
  if (error) throw error
  return data
}

// ---------- Members: updates & transfers ----------
export async function updateMemberProfile(id: string, fields: { name: string; phone?: string; dob?: string }) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.members = data.members.map(m => m.id === id ? { ...m, name: fields.name, phone: fields.phone || '', dob: fields.dob || '' } as any : m)
    saveData(data)
    return
  }
  const { error } = await supabase.rpc('rpc_update_member_profile', {
    p_id: id,
    p_name: fields.name,
    p_phone: fields.phone || null,
    p_dob: fields.dob || null,
  })
  if (error) throw error
}

export async function updateMemberGroup(id: string, careGroupId: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.members = data.members.map(m => m.id === id ? { ...m, careGroupId } as any : m)
    saveData(data)
    return
  }
  const { error } = await supabase.rpc('rpc_update_member_group', { p_id: id, p_care_group_id: careGroupId })
  if (error) throw error
}

export async function listAttendanceByMember(memberId: string, limit: number = 50) {
  if (!USE_SUPABASE) return getStoredData().attendance.filter(a => a.memberId === memberId).sort((a,b)=> (a.date>b.date?-1:1)).slice(0, limit)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('member_id', memberId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ---------- Merge Duplicates ----------
export async function mergeMembers(primaryId: string, duplicateIds: string[]) {
  if (duplicateIds.length === 0) return
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    const dupeSet = new Set(duplicateIds)
    data.attendance = data.attendance.map(a => dupeSet.has(a.memberId) ? { ...a, memberId: primaryId } : a)
    data.members = data.members.filter(m => !dupeSet.has(m.id))
    saveData(data)
    return
  }
  const upd = await supabase.from('attendance').update({ member_id: primaryId }).in('member_id', duplicateIds)
  if (upd.error) throw upd.error
  const del = await supabase.from('members').delete().in('id', duplicateIds)
  if (del.error) throw del.error
}

// ---------- Users listing (for Login select) ----------
export async function listUsers() {
  if (!USE_SUPABASE) return getStoredData().users
  const { data, error } = await supabase.from('users').select('id,name,role,phone,care_group_id')
  if (error) throw error
  return data
}

// ---------- Follow-ups ----------
export async function listFollowUpsByGroup(careGroupId: string) {
  if (!USE_SUPABASE) return (getStoredData().followUps || []).filter(f => f.careGroupId === careGroupId)
  const { data, error } = await supabase.from('follow_ups').select('*').eq('care_group_id', careGroupId)
  if (error) throw error
  return data as unknown as FollowUpTask[]
}

export async function completeFollowUp(id: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.followUps = (data.followUps || []).map(f => f.id === id ? { ...f, status: 'done', completedAt: new Date().toISOString() } : f)
    saveData(data)
    return
  }
  const { error } = await supabase.from('follow_ups').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function reopenFollowUp(id: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.followUps = (data.followUps || []).map(f => f.id === id ? { ...f, status: 'open', completedAt: undefined } : f)
    saveData(data)
    return
  }
  const { error } = await supabase.from('follow_ups').update({ status: 'open', completed_at: null }).eq('id', id)
  if (error) throw error
}

// ---------- Admins ----------
export async function listAdmins() {
  if (!USE_SUPABASE) return getStoredData().users.filter(u => u.role === 'admin')
  const { data, error } = await supabase.from('users').select('id,name,role,phone,care_group_id').eq('role', 'admin')
  if (error) throw error
  return data
}

export async function createAdminUser(name: string, password: string) {
  if (!USE_SUPABASE) {
    const data = { ...getStoredData() }
    data.users.push({ id: `admin${Date.now()}`, name, role: 'admin', password })
    saveData(data)
    return
  }
  const password_hash = await sha256Hex(password)
  const { error } = await supabase.rpc('rpc_create_user', {
    p_name: name,
    p_role: 'admin',
    p_phone: null,
    p_care_group_id: null,
    p_password_hash: password_hash,
  })
  if (error) throw error
}

// ---------- Auth (phase 1 stub) ----------
export async function loginLocalOrSupabase(name: string, password: string) {
  if (!USE_SUPABASE) {
    const data = getStoredData()
    // For offline/dev local: hash for comparison if local users stored plain; try both
    const hash = await sha256Hex(password)
    const user = data.users.find(u => u.name === name && (u.password === password || (u as any).password_hash === hash))
    if (!user) throw new Error('Invalid credentials')
    return user
  }
  // Placeholder: using table-based users for now; later switch to Supabase Auth
  const { data, error } = await supabase.from('users').select('*').eq('name', name).limit(1).maybeSingle()
  if (error) throw error
  const hash = await sha256Hex(password)
  // Temporary compatibility: accept either hashed or plaintext (until migration is complete)
  if (!data || (data.password_hash !== hash && data.password_hash !== password)) throw new Error('Invalid credentials')
  return data
}
