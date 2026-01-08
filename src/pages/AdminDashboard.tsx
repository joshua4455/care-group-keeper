import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppData, CareGroup, Member, User } from '@/lib/mockData';
import { getCurrentUser } from '@/lib/session';
import { fetchCareGroups, fetchMembersByGroup, insertMember, bulkInsertMembers, createLeaderUser, setCareGroupLeader, updateUserPassword, fetchAllMembers, fetchAllAttendance, listLeaders, listAdmins, deleteUser, createAdminUser, loginLocalOrSupabase, updateMemberProfile, listAttendanceByMember, updateMemberGroup, mergeMembers } from '@/lib/api';
import { downloadCSV, parseMembersCSV } from '@/lib/csv';
import { queueAction } from '@/lib/sync';
import { copyText } from '@/lib/utils';
import { assignMemberGroupByDob, idToDay, promoteMemberToLeaderWithPassword, clearGroupLeader, getDayNameFromDob } from '@/lib/assignment';
import { Plus, Users, UserPlus, FolderPlus, History, Pencil, Shuffle, Merge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Attendance history widget (Supabase-backed)
const AttendanceHistory = ({ memberId, groups }: { memberId: string; groups: any[] }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const data = await listAttendanceByMember(memberId, 50);
        setRows(data);
      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || 'Failed to load history', variant: 'destructive' });
        setRows([]);
      }
    })();
  }, [memberId]);
  if (rows === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <div className="text-sm text-muted-foreground">No attendance records for this member.</div>;
  return (
    <div className="space-y-2">
      {rows.map((a: any) => {
        const grp = groups.find((g: any) => g.id === (a.care_group_id || a.careGroupId));
        const status = a.status;
        return (
          <div key={a.id} className="p-3 border rounded-md flex items-center justify-between">
            <div>
              <div className="font-medium">{new Date(a.date).toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">{grp?.name}</div>
            </div>
            <div className={status === 'present' ? 'text-green-600' : 'text-red-600'}>
              {status}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminDashboard = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [membersFlat, setMembersFlat] = useState<any[]>([]);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isLeaderDialogOpen, setIsLeaderDialogOpen] = useState(false);
  const { toast } = useToast();
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [generatedPwd, setGeneratedPwd] = useState<string>('');
  const [generatedLeaderName, setGeneratedLeaderName] = useState<string>('');

  // Member management state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<string>('');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [jsonPreview, setJsonPreview] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState({ name: '', phone: '', dob: '' });
  const [transferTargetGroupId, setTransferTargetGroupId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [waDate, setWaDate] = useState<string>('');
  const [waGroupId, setWaGroupId] = useState<string>('');
  const [waStatus, setWaStatus] = useState<'absent' | 'present'>('absent');
  const [waPreview, setWaPreview] = useState<string>('');
  // Manage Users state
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPwd, setNewAdminPwd] = useState('');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removeTargetName, setRemoveTargetName] = useState<string>('');
  const [removePwd, setRemovePwd] = useState<string>('');
  const [admins, setAdmins] = useState<any[]>([]);

  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    dob: '',
  });

  const [newLeader, setNewLeader] = useState({
    name: '',
    careGroupId: '',
  });

  const refreshData = () => {};

  // Load groups and members from Supabase (fallback to local already set in state)
  useEffect(() => {
    (async () => {
      try {
        const gs = await fetchCareGroups();
        if (Array.isArray(gs) && gs.length) {
          setGroups(gs);
          // fetch members for each group and flatten
          const list = await Promise.all(gs.map(async (g: any) => {
            try {
              const ms = await fetchMembersByGroup(g.id);
              return ms.map((m: any) => ({ id: m.id, name: m.name, phone: m.phone || '', dob: m.dob || '1900-01-01', careGroupId: m.care_group_id ?? m.careGroupId }));
            } catch {
              return [] as any[];
            }
          }));
          setMembersFlat(list.flat());
        }
        // load admins list from Supabase
        try {
          const as = await listAdmins();
          setAdmins(as);
        } catch {}
        // load leaders count
        try {
          const leaders = await listLeaders();
          setLeadersCount(leaders.length || 0);
        } catch {}
      } catch {
        // keep empty if Supabase fails
      }
    })();
  }, []);

  const handleResetLeaderPassword = async (groupId: string) => {
    try {
      const grp = groups.find((g: any) => g.id === groupId);
      const leaderUserId = (grp as any)?.leader_id || (grp as any)?.leaderId;
      if (!leaderUserId) return;
      const newPwd = Math.random().toString(36).slice(-10);
      await updateUserPassword(leaderUserId, newPwd);
      setGeneratedPwd(newPwd);
      setGeneratedLeaderName('Leader');
      setPwdDialogOpen(true);
      toast({ title: 'Password reset', description: `A new password was generated for the group leader` });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to reset password', variant: 'destructive' });
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.phone || !newMember.dob) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    try {
      const assigned = assignMemberGroupByDob({
        id: `tmp`, name: newMember.name, phone: newMember.phone, dob: newMember.dob,
      } as any);
      // assigned.careGroupId is the weekday code (sun..sat); translate to group UUID
      const targetGroup = groups.find((g: any) => (g.code || '') === assigned.careGroupId);
      const targetGroupId = targetGroup?.id || assigned.careGroupId; // fallback if code missing
      await insertMember({ name: newMember.name, phone: newMember.phone, dob: newMember.dob, careGroupId: targetGroupId });
      // Refresh membersFlat for that group (by UUID)
      try {
        const ms = await fetchMembersByGroup(targetGroupId);
        const merged = (membersFlat.filter((m:any)=>m.careGroupId!==targetGroupId)).concat(ms.map((m:any)=>({ id:m.id,name:m.name,phone:m.phone||'',dob:m.dob||'1900-01-01',careGroupId:m.care_group_id??m.careGroupId })));
        setMembersFlat(merged);
      } catch {}
      setNewMember({ name: '', phone: '', dob: '' });
      setIsMemberDialogOpen(false);
      const grp = groups.find((g:any)=> g.id === targetGroupId);
      const dayName = getDayNameFromDob(newMember.dob);
      toast({ title: 'Success', description: `Member added to ${grp?.name || 'group'} (${dayName})` });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to add member', variant: 'destructive' });
    }
  };

  const handleAddLeader = async () => {
    if (!newLeader.name || !newLeader.careGroupId) {
      toast({ title: 'Error', description: 'Enter leader name and select a group', variant: 'destructive' });
      return;
    }
    try {
      const pwd = Math.random().toString(36).slice(-10);
      const created = await createLeaderUser(newLeader.name, newLeader.careGroupId, pwd);
      await setCareGroupLeader(newLeader.careGroupId, created.id);
      setGeneratedPwd(pwd);
      setGeneratedLeaderName(newLeader.name);
      setPwdDialogOpen(true);
      setNewLeader({ name: '', careGroupId: '' });
      setIsLeaderDialogOpen(false);
      toast({ title: 'Success', description: 'Leader added and assigned to group' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to add leader', variant: 'destructive' });
    }
  };

  const handleAssignGroupLeaderFromMember = async (groupId: string, memberIdOrNone: string) => {
    try {
      if (memberIdOrNone === 'none') {
        await setCareGroupLeader(groupId, null);
        const grp = groups.find((g:any)=>g.id===groupId);
        toast({ title: 'Leader cleared', description: `Leader cleared for ${grp?.name || 'group'}` });
        return;
      }
      const member = membersFlat.find(m => m.id === memberIdOrNone);
      if (!member) { toast({ title: 'Error', description: 'Member not found', variant: 'destructive' }); return; }
      const pwd = Math.random().toString(36).slice(-10);
      const created = await createLeaderUser(member.name, groupId, pwd);
      await setCareGroupLeader(groupId, created.id);
      setGeneratedPwd(pwd);
      setGeneratedLeaderName(member.name);
      setPwdDialogOpen(true);
      const grp = groups.find((g:any)=>g.id===groupId);
      toast({ title: 'Leader assigned', description: `${member.name} assigned to ${grp?.name || 'group'}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to assign leader', variant: 'destructive' });
    }
  };

  const [leadersCount, setLeadersCount] = useState<number>(0);
  const stats = {
    totalGroups: groups.length,
    totalMembers: membersFlat.length,
    totalLeaders: leadersCount,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">Manage care groups, leaders, and members</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover border-primary/20 shadow-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                Care Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">
                {stats.totalGroups}
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover border-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Leaders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-secondary">
                {stats.totalLeaders}
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {stats.totalMembers}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-primary" />
                    Care Groups (by Day of Birth)
                  </CardTitle>
                  <CardDescription>Assign a leader to each weekday group</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {groups.map((group: any) => {
                  const membersInGroup = membersFlat.filter(m => m.careGroupId === group.id);
                  const memberCount = membersInGroup.length;
                  // We cannot derive a memberId from leader user; default to none
                  const currentLeaderMemberId = 'none';
                  return (
                    <div key={group.id} className="p-4 border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-all duration-300 hover:shadow-md group">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {group.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {group.day ? `Day: ${group.day} • ` : ''}Members: {memberCount}
                          </div>
                        </div>
                        <div className="min-w-[220px] flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Leader</Label>
                            <Select
                              value={currentLeaderMemberId || 'none'}
                              onValueChange={(value) => handleAssignGroupLeaderFromMember(group.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select leader" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {membersInGroup.map((m: any) => (
                                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetLeaderPassword(group.id)}
                            disabled={!group.leaderId}
                            title={group.leaderId ? 'Reset leader password' : 'Assign a leader to enable reset'}
                          >
                            Reset Password
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-xl">WhatsApp Member List</CardTitle>
              <CardDescription>Copy absent/present members (Name - Phone), with reasons inline for absences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <div className="w-full sm:w-48">
                  <Label>Date</Label>
                  <input type="date" className="w-full h-10 border rounded-md px-3 bg-background" value={waDate} onChange={(e) => setWaDate(e.target.value)} />
                </div>
                <div className="w-full sm:w-56">
                  <Label>Group</Label>
                  <Select value={waGroupId} onValueChange={setWaGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {(groups).map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-40">
                  <Label>Status</Label>
                  <Select value={waStatus} onValueChange={(v) => setWaStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={async () => {
                      if (!waDate || !waGroupId) {
                        toast({ title: 'Missing info', description: 'Select a date and group', variant: 'destructive' });
                        return;
                      }
                      try {
                        // Fetch attendance for date (all or specific group)
                        let recs: any[] = [];
                        if (waGroupId === 'all') {
                          recs = await fetchAllAttendance();
                          recs = recs.filter(r => r.date === waDate && r.status === waStatus);
                        } else {
                          recs = await fetchAllAttendance();
                          recs = recs.filter(r => r.date === waDate && (r.care_group_id === waGroupId || r.careGroupId === waGroupId) && r.status === waStatus);
                        }
                        // Build member map from Supabase
                        const allMembers: any[] = await fetchAllMembers();
                        const memberMap: Record<string, any> = {};
                        allMembers.forEach((m: any) => { memberMap[m.id] = m; });
                        const groupIndex: Record<string, number> = Object.fromEntries(groups.map((g: any, idx: number) => [g.id, idx]));
                        const items = recs.map(r => {
                          const memberId = r.member_id || r.memberId;
                          const careGroupId = r.care_group_id || r.careGroupId;
                          const m = memberMap[memberId];
                          if (!m) return null;
                          const reason = waStatus === 'absent' && (r.absence_reason || r.absenceReason) ? ` (${r.absence_reason || r.absenceReason})` : '';
                          return {
                            line: `${m.name} - ${m.phone || ''}${reason}`,
                            name: (m.name || '').toLowerCase(),
                            gidx: groupIndex[careGroupId] ?? 999,
                          };
                        }).filter(Boolean) as Array<{ line: string; name: string; gidx: number }>;
                        if (waGroupId === 'all') {
                          items.sort((a, b) => a.gidx - b.gidx || a.name.localeCompare(b.name));
                        } else {
                          items.sort((a, b) => a.name.localeCompare(b.name));
                        }
                        const lines = items.map(i => i.line);
                        const statusLabel = waStatus === 'absent' ? 'Absent' : 'Present';
                        const headerGroup = waGroupId === 'all' ? 'All Groups' : (groups.find((g:any)=>g.id===waGroupId)?.name || 'Group');
                        const header = `${headerGroup} - ${statusLabel} ${waDate}`;
                        const text = [header, ...lines].join('\n');
                        setWaPreview(text);
                      } catch (e:any) {
                        toast({ title: 'Error', description: e?.message || 'Failed to generate list', variant: 'destructive' });
                      }
                    }}
                  >
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!waPreview) {
                        toast({ title: 'Nothing to copy', description: 'Generate the list first', variant: 'destructive' });
                        return;
                      }
                      const ok = await copyText(waPreview);
                      if (ok) toast({ title: 'Copied', description: 'List copied to clipboard' });
                      else toast({ title: 'Copy failed', description: 'Select and copy manually from the preview', variant: 'destructive' });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="rounded-md border p-3 text-sm whitespace-pre-wrap min-h-[80px] bg-muted">
                {waPreview || 'Preview will appear here after Generate'}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-xl">Add New Admin</CardTitle>
              <CardDescription>Create additional admin accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 border rounded-lg">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={newAdminPwd} onChange={(e) => setNewAdminPwd(e.target.value)} placeholder="Min 4 characters" />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      onClick={async () => {
                        if (!newAdminName.trim()) { toast({ title: 'Missing name', description: 'Enter a name', variant: 'destructive' }); return; }
                        if (!newAdminPwd || newAdminPwd.length < 4) { toast({ title: 'Weak password', description: 'Use at least 4 characters', variant: 'destructive' }); return; }
                        try {
                          await createAdminUser(newAdminName.trim(), newAdminPwd);
                          const as = await listAdmins();
                          setAdmins(as);
                          setNewAdminName(''); setNewAdminPwd('');
                          toast({ title: 'Admin created', description: 'New admin account added' });
                        } catch (e:any) {
                          toast({ title: 'Error', description: e?.message || 'Failed to create admin', variant: 'destructive' });
                        }
                      }}
                    >
                      Add Admin
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="font-semibold mb-2">Current Admins</div>
                <div className="space-y-2">
                  {admins.map(u => {
                    const canRemove = admins.length > 1;
                    return (
                      <div key={u.id} className="p-2 border rounded-md flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">User ID: {u.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">admin</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={!canRemove}
                            onClick={() => {
                              if (!canRemove) return;
                              setRemoveTargetId(u.id);
                              setRemoveTargetName(u.name);
                              setRemovePwd('');
                              setRemoveDialogOpen(true);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {admins.length === 0 && (
                    <div className="text-sm text-muted-foreground">No admins yet.</div>
                  )}
                </div>
              </div>
              <Dialog open={removeDialogOpen} onOpenChange={(o) => setRemoveDialogOpen(o)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Admin Removal</DialogTitle>
                    <DialogDescription>
                      Removing admin "{removeTargetName}". Please enter your admin password to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Your admin password</Label>
                      <Input type="password" value={removePwd} onChange={(e) => setRemovePwd(e.target.value)} placeholder="Enter your password" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            if (!removeTargetId) { setRemoveDialogOpen(false); return; }
                            const adminsNow = await listAdmins();
                            if (!adminsNow || adminsNow.length <= 1) {
                              toast({ title: 'Cannot remove', description: 'At least one admin must remain', variant: 'destructive' });
                              return;
                            }
                            const me = getCurrentUser();
                            if (!me || me.role !== 'admin') { toast({ title: 'Not authorized', description: 'Only admins can perform this action', variant: 'destructive' }); return; }
                            if (!removePwd) { toast({ title: 'Missing password', description: 'Enter your password to confirm', variant: 'destructive' }); return; }
                            try {
                              await loginLocalOrSupabase(me.name, removePwd);
                            } catch {
                              toast({ title: 'Incorrect password', description: 'Password verification failed', variant: 'destructive' });
                              return;
                            }
                            await deleteUser(removeTargetId);
                            const as = await listAdmins();
                            setAdmins(as);
                            toast({ title: 'Admin removed', description: `${removeTargetName} has been removed` });
                            setRemoveDialogOpen(false);
                            setRemovePwd('');
                            setRemoveTargetId(null);
                            setRemoveTargetName('');
                          } catch (e:any) {
                            toast({ title: 'Error', description: e?.message || 'Failed to remove admin', variant: 'destructive' });
                          }
                        }}
                      >
                        Confirm Remove
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Members
                  </CardTitle>
                  <CardDescription>All care group members</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 shadow-glow">
                        <UserPlus className="w-4 h-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>Add a new member (auto-assigned to a weekday group based on DOB)</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={newMember.name}
                            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={newMember.phone}
                            onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                            placeholder="555-0123"
                          />
                        </div>
                        <div>
                          <Label>Date of Birth (YYYY-MM-DD)</Label>
                          <Input
                            value={newMember.dob}
                            onChange={(e) => setNewMember({ ...newMember, dob: e.target.value })}
                            placeholder="1995-06-18"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Member will be assigned to the group for the weekday they were born.</p>
                        </div>
                        <Button onClick={handleAddMember} className="w-full">Add Member</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Import CSV</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Members CSV</DialogTitle>
                        <DialogDescription>Columns: name, phone, dob (header row optional). Existing phone numbers will be skipped.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const text = await file.text();
                            setCsvPreview(text.slice(0, 1000));
                            try {
                              const parsed = parseMembersCSV(text);
                              const existingPhones = new Set((membersFlat).map((m:any)=> (m.phone || '').trim()));
                              const rows: Array<{ name: string; phone?: string; dob?: string; careGroupId: string }> = [];
                              let added = 0; let skipped = 0;
                              parsed.forEach((r, idx) => {
                                const phoneKey = (r.phone || '').trim();
                                if (!phoneKey || existingPhones.has(phoneKey)) { skipped++; return; }
                                const assigned = assignMemberGroupByDob({ id: `tmp${idx}`, name: r.name, phone: r.phone, dob: r.dob } as any);
                                const target = groups.find((g:any)=> (g.code || '') === assigned.careGroupId);
                                const gid = target?.id || assigned.careGroupId;
                                rows.push({ name: r.name, phone: r.phone, dob: r.dob, careGroupId: gid });
                                existingPhones.add(phoneKey);
                                added++;
                              });
                              if (rows.length) await bulkInsertMembers(rows);
                              // refresh members for all groups we touched
                              const groupsTouched = Array.from(new Set(rows.map(r => r.careGroupId)));
                              const lists = await Promise.all(groupsTouched.map(async gid => {
                                try { const ms = await fetchMembersByGroup(gid); return ms.map((m:any)=>({ id:m.id,name:m.name,phone:m.phone||'',dob:m.dob||'1900-01-01',careGroupId:m.care_group_id??m.careGroupId })); } catch { return [] as any[]; }
                              }));
                              const remaining = membersFlat.filter((m:any)=>!groupsTouched.includes(m.careGroupId));
                              setMembersFlat(remaining.concat(...lists));
                              toast({ title: 'Import complete', description: `Added ${added} member(s), skipped ${skipped}` });
                              setImportDialogOpen(false);
                            } catch (err: any) {
                              toast({ title: 'Import failed', description: err?.message || 'Could not import CSV', variant: 'destructive' });
                            }
                          }}
                        />
                        {csvPreview && (
                          <div className="rounded-md border p-2 max-h-40 overflow-auto text-xs bg-muted whitespace-pre-wrap">{csvPreview}</div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const rows: any[] = await fetchAllMembers();
                        const groupMap: Record<string, any> = {};
                        groups.forEach((g:any)=> { groupMap[g.id] = g; });
                        const header = ['id','name','phone','dob','groupName'];
                        const csvRows = rows.map(r => {
                          const gid = r.care_group_id || r.careGroupId || '';
                          const g = groupMap[gid];
                          const groupName = g?.name || gid || '';
                          return [r.id, r.name, r.phone || '', r.dob || '', groupName];
                        });
                        const csv = [header, ...csvRows].map(cols => cols.map(v => {
                          const s = String(v ?? '');
                          return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
                        }).join(',')).join('\n');
                        downloadCSV(`members_${new Date().toISOString().slice(0,10)}.csv`, csv);
                      } catch (e: any) {
                        toast({ title: 'Export failed', description: e?.message || 'Could not export members', variant: 'destructive' });
                      }
                    }}
                  >
                    Export Members
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const rows: any[] = await fetchAllAttendance();
                        const members: any[] = await fetchAllMembers();
                        const memberMap: Record<string, any> = {};
                        members.forEach(m => { memberMap[m.id] = m; });
                        const groupMap: Record<string, any> = {};
                        groups.forEach((g:any)=> { groupMap[g.id] = g; });
                        const header = ['id','date','memberName','groupName','status','absenceReason'];
                        const csvRows = rows.map(r => {
                          const memberId = r.member_id || r.memberId;
                          const careGroupId = r.care_group_id || r.careGroupId;
                          const member = memberMap[memberId];
                          const group = groupMap[careGroupId];
                          const memberName = member?.name || memberId || '';
                          const groupName = group?.name || careGroupId || '';
                          return [r.id, r.date, memberName, groupName, r.status, r.absence_reason || r.absenceReason || ''];
                        });
                        const csv = [header, ...csvRows].map(cols => cols.map(v => {
                          const s = String(v ?? '');
                          return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
                        }).join(',')).join('\n');
                        downloadCSV(`attendance_${new Date().toISOString().slice(0,10)}.csv`, csv);
                      } catch (e: any) {
                        toast({ title: 'Export failed', description: e?.message || 'Could not export attendance', variant: 'destructive' });
                      }
                    }}
                  >
                    Export Attendance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const rows: any[] = await listLeaders();
                        const groupMap: Record<string, any> = {};
                        groups.forEach((g:any)=> { groupMap[g.id] = g; });
                        const header = ['id','name','role','groupName'];
                        const csvRows = rows.map(r => {
                          const gid = r.care_group_id || r.careGroupId || '';
                          const g = groupMap[gid];
                          const groupName = g?.name || gid || '';
                          return [r.id, r.name, r.role, groupName];
                        });
                        const csv = [header, ...csvRows].map(cols => cols.map(v => {
                          const s = String(v ?? '');
                          return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
                        }).join(',')).join('\n');
                        downloadCSV(`leaders_${new Date().toISOString().slice(0,10)}.csv`, csv);
                      } catch (e: any) {
                        toast({ title: 'Export failed', description: e?.message || 'Could not export leaders', variant: 'destructive' });
                      }
                    }}
                  >
                    Export Leaders
                  </Button>
                  {/* Backup/Restore JSON removed: Supabase is the source of truth now */}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setMergeDialogOpen(true)}>
                  <Merge className="w-4 h-4" /> Merge Duplicates
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {membersFlat.map((member: any) => {
                  const group = groups.find((g: any) => g.id === member.careGroupId);
                  return (
                    <div key={member.id} className="p-4 border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-all duration-300 hover:shadow-md group">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {member.name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {member.phone} • {group?.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        DOB: {member.dob}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                          setSelectedMember(member);
                          setEditMember({ name: member.name, phone: member.phone, dob: member.dob });
                          setEditDialogOpen(true);
                        }}>
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                          setSelectedMember(member);
                          setHistoryDialogOpen(true);
                        }}>
                          <History className="w-3.5 h-3.5" /> History
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                          setSelectedMember(member);
                          setTransferTargetGroupId(member.careGroupId);
                          setTransferReason('');
                          setTransferDialogOpen(true);
                        }}>
                          <Shuffle className="w-3.5 h-3.5" /> Transfer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password modal for leader credentials */}
        <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leader Password Generated</DialogTitle>
              <DialogDescription>
                Share this password securely with <span className="font-medium">{generatedLeaderName}</span>. It will not be shown again after you close this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-3 rounded-md border font-mono text-lg select-all break-all bg-muted">
                {generatedPwd}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(generatedPwd);
                      toast({ title: 'Copied', description: 'Password copied to clipboard' });
                    } catch {
                      toast({ title: 'Copy failed', description: 'Select and copy manually', variant: 'destructive' });
                    }
                  }}
                >
                  Copy Password
                </Button>
                <Button variant="outline" onClick={() => setPwdDialogOpen(false)}>Close</Button>
              </div>
              <p className="text-xs text-muted-foreground">For security, ask the leader to change their password after first login (we can add a change password screen next).</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>Update member profile details</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editMember.phone} onChange={(e) => setEditMember({ ...editMember, phone: e.target.value })} />
              </div>
              <div>
                <Label>Date of Birth (YYYY-MM-DD)</Label>
                <Input value={editMember.dob} onChange={(e) => setEditMember({ ...editMember, dob: e.target.value })} />
              </div>
              <Button
                onClick={async () => {
                  if (!selectedMember) return;
                  try {
                    await updateMemberProfile(selectedMember.id, { name: editMember.name, phone: editMember.phone, dob: editMember.dob });
                    // Refresh the member in membersFlat
                    setMembersFlat(prev => prev.map((m:any) => m.id === selectedMember.id ? { ...m, name: editMember.name, phone: editMember.phone, dob: editMember.dob } : m));
                    setEditDialogOpen(false);
                    toast({ title: 'Member updated', description: 'Profile changes saved' });
                  } catch (e:any) {
                    toast({ title: 'Error', description: e?.message || 'Failed to update member', variant: 'destructive' });
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Attendance History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Attendance History</DialogTitle>
              <DialogDescription>Recent records for {selectedMember?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-80 overflow-auto">
              {selectedMember && (
                <AttendanceHistory memberId={selectedMember.id} groups={groups} />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Transfer Member Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Member</DialogTitle>
              <DialogDescription>Override auto-assigned group for exceptional cases</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Target Group</Label>
                <Select value={transferTargetGroupId} onValueChange={setTransferTargetGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="e.g., Lives with Monday group family now" />
              </div>
              <Button
                onClick={async () => {
                  if (!selectedMember) return;
                  if (!transferTargetGroupId || !transferReason.trim()) {
                    toast({ title: 'Missing info', description: 'Select a target group and provide a reason', variant: 'destructive' });
                    return;
                  }
                  try {
                    await updateMemberGroup(selectedMember.id, transferTargetGroupId);
                    setMembersFlat(prev => prev.map((m:any)=> m.id===selectedMember.id ? { ...m, careGroupId: transferTargetGroupId } : m));
                    setTransferDialogOpen(false);
                    const grp = groups.find((g:any)=>g.id===transferTargetGroupId);
                    toast({ title: 'Member transferred', description: `${selectedMember.name} moved to ${grp?.name || 'group'}` });
                  } catch (e:any) {
                    toast({ title: 'Error', description: e?.message || 'Failed to transfer member', variant: 'destructive' });
                  }
                }}
              >
                Confirm Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Merge Duplicates Dialog (Supabase-backed) */}
        <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge Duplicates</DialogTitle>
              <DialogDescription>Detect members with identical phone or name and merge them</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-80 overflow-auto">
              {(() => {
                // Build duplicate groups from Supabase-loaded membersFlat
                const byPhone = new Map<string, any[]>();
                membersFlat.forEach((m: any) => {
                  const key = (m.phone || '').trim();
                  if (!key) return;
                  byPhone.set(key, [...(byPhone.get(key) || []), m]);
                });
                const phoneDupes = Array.from(byPhone.values()).filter(arr => arr.length > 1);
                const byName = new Map<string, any[]>();
                membersFlat.forEach((m: any) => {
                  const key = (m.name || '').trim().toLowerCase();
                  if (!key) return;
                  byName.set(key, [...(byName.get(key) || []), m]);
                });
                const nameDupes = Array.from(byName.values()).filter(arr => arr.length > 1);

                const renderGroup = (group: any[]) => {
                  const primary = group[0];
                  const duplicates = group.slice(1);
                  return (
                    <div key={primary.id} className="p-3 border rounded-md">
                      <div className="font-medium">Keep: {primary.name} • {primary.phone}</div>
                      {duplicates.map(d => (
                        <div key={d.id} className="text-sm text-muted-foreground">Merge: {d.name} • {d.phone}</div>
                      ))}
                      <div className="mt-2">
                        <Button size="sm" onClick={async () => {
                          try {
                            await mergeMembers(primary.id, duplicates.map(d => d.id));
                            // Refresh members list
                            const ms = await fetchAllMembers();
                            setMembersFlat(ms.map((m:any)=>({ id:m.id,name:m.name,phone:m.phone||'',dob:m.dob||'1900-01-01',careGroupId:m.care_group_id??m.careGroupId })));
                            toast({ title: 'Merged', description: `Merged ${duplicates.length} duplicate record(s) into ${primary.name}` });
                          } catch (e:any) {
                            toast({ title: 'Error', description: e?.message || 'Failed to merge', variant: 'destructive' });
                          }
                        }}>Merge Group</Button>
                      </div>
                    </div>
                  );
                };

                const rendered: JSX.Element[] = [];
                phoneDupes.forEach(arr => rendered.push(renderGroup(arr)));
                // For name dupes, skip groups already shown by phone
                const included = new Set<string>([].concat(...phoneDupes.map(arr => arr.map((m:any) => m.id))));
                nameDupes.forEach(arr => {
                  const filtered = arr.filter((m:any) => !included.has(m.id));
                  if (filtered.length > 1) rendered.push(renderGroup(filtered));
                });
                if (rendered.length === 0) return <p className="text-sm text-muted-foreground">No duplicates found.</p>;
                return <div className="space-y-2">{rendered}</div>;
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;