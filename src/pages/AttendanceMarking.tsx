import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AttendanceRecord, FollowUpTask } from '@/lib/mockData';
import { getCurrentUser } from '@/lib/session';
import { queueAction } from '@/lib/sync';
import { CalendarIcon, Save, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn, copyText } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchCareGroups, fetchMembersByGroup, upsertAttendance, fetchAbsenceReasons, listAttendanceByMember, createFollowUpIfNotExists } from '@/lib/api';

interface MemberAttendance {
  memberId: string;
  status: 'present' | 'absent';
  absenceReason: string;
}

const AttendanceMarking = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [date, setDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, MemberAttendance>>({});
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waAbsentPreview, setWaAbsentPreview] = useState<string>('');
  const [waPresentPreview, setWaPresentPreview] = useState<string>('');
  const [absenceReasons, setAbsenceReasons] = useState<Array<{ id: string; label: string }>>([]);

  if (!user) {
    return <div>Access denied</div>;
  }

  // Determine which group we're marking: leaders default to their group; admins choose
  const [selectedGroup, setSelectedGroup] = useState<string>(user.role === 'leader' ? (user.careGroupId || '') : '');
  const [groups, setGroups] = useState<any[]>([]);
  const [membersApi, setMembersApi] = useState<any[]>([]);

  // Load groups from Supabase
  useEffect(() => {
    (async () => {
      try {
        const gs = await fetchCareGroups();
        if (Array.isArray(gs) && gs.length) {
          setGroups(gs);
          if (user.role === 'admin' && !selectedGroup) setSelectedGroup(gs[0].id);
        }
      } catch {
        // keep empty if fetch fails
      }
      // load absence reasons
      try {
        const ars = await fetchAbsenceReasons();
        if (Array.isArray(ars) && ars.length) {
          setAbsenceReasons(ars);
        } else {
          setAbsenceReasons([
            { id: 'sick', label: 'Sick' },
            { id: 'health', label: 'Health' },
            { id: 'travel', label: 'Travel' },
            { id: 'work', label: 'Work' },
            { id: 'family', label: 'Family' },
            { id: 'other', label: 'Other' },
          ]);
        }
      } catch {
        setAbsenceReasons([
          { id: 'sick', label: 'Sick' },
          { id: 'health', label: 'Health' },
          { id: 'travel', label: 'Travel' },
          { id: 'work', label: 'Work' },
          { id: 'family', label: 'Family' },
          { id: 'other', label: 'Other' },
        ]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load members from Supabase for selected group
  useEffect(() => {
    if (!selectedGroup) return;
    (async () => {
      try {
        const ms = await fetchMembersByGroup(selectedGroup);
        setMembersApi(ms.map((m: any) => ({ id: m.id, name: m.name, phone: m.phone || '', dob: m.dob || '1900-01-01', careGroupId: m.care_group_id ?? m.careGroupId })));
      } catch {
        setMembersApi([]);
      }
    })();
  }, [selectedGroup]);
  const members = membersApi;
  const group = (groups.length ? groups : []).find((g: any) => g.id === selectedGroup);

  const handleStatusChange = (memberId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: {
        memberId,
        status,
        absenceReason: status === 'present' ? '' : (prev[memberId]?.absenceReason || ''),
      },
    }));
  };

  const handleReasonChange = (memberId: string, reason: string) => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        memberId,
        status: prev[memberId]?.status || 'absent',
        absenceReason: reason,
      },
    }));
  };

  const handleSubmit = async () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // If offline, queue the action and exit early
    if (!navigator.onLine) {
      const records = members.map(m => ({
        memberId: m.id,
        status: (attendance[m.id]?.status || 'absent') as 'present' | 'absent',
        absenceReason: attendance[m.id]?.absenceReason,
      }));
      queueAction({
        type: 'attendance_save',
        payload: { date: dateStr, careGroupId: selectedGroup, records },
      });
      toast({ title: 'Saved offline', description: 'Attendance queued and will sync when online.' });
      // Build WhatsApp lists from the records just saved offline
      const absLines = records
        .filter(r => r.status === 'absent')
        .map(r => {
          const m = members.find(mm => mm.id === r.memberId);
          if (!m) return '';
          const reason = r.absenceReason ? ` (${r.absenceReason})` : '';
          return `${m.name} - ${m.phone}${reason}`;
        })
        .filter(Boolean) as string[];
      const presLines = records
        .filter(r => r.status === 'present')
        .map(r => {
          const m = members.find(mm => mm.id === r.memberId);
          return m ? `${m.name} - ${m.phone}` : '';
        })
        .filter(Boolean) as string[];
      const groupName = (groups.find((g:any)=>g.id===selectedGroup)?.name) || 'Group';
      setWaAbsentPreview([`${groupName} - Absent ${dateStr}`, ...absLines].join('\n'));
      setWaPresentPreview([`${groupName} - Present ${dateStr}`, ...presLines].join('\n'));
      setWaDialogOpen(true);
      return;
    }

    // Try Supabase online save first; skip synthetic rows
    try {
      const realRecords = members
        .filter(m => !(m.id.startsWith('leader-') || m.id.startsWith('admin-')))
        .map(m => ({
          memberId: m.id,
          status: (attendance[m.id]?.status || 'absent') as 'present' | 'absent',
          absenceReason: attendance[m.id]?.absenceReason,
        }));
      await upsertAttendance({ date: dateStr, careGroupId: selectedGroup, records: realRecords });
      // After save: create follow-ups
      const leaderUserId: string | null = (groups.find((g:any)=>g.id===selectedGroup)?.leader_id) ?? null;
      // 1) Immediate sick/health reasons
      for (const rec of realRecords) {
        if (rec.status === 'absent') {
          const reason = (rec.absenceReason || '').toLowerCase();
          if (reason.includes('sick') || reason.includes('health')) {
            await createFollowUpIfNotExists(rec.memberId, selectedGroup, leaderUserId, rec.absenceReason || 'Sick/Health');
          }
        }
      }
      // 2) Two consecutive absences
      for (const rec of realRecords) {
        try {
          const lastTwo = await listAttendanceByMember(rec.memberId, 2);
          if (Array.isArray(lastTwo) && lastTwo.length >= 2) {
            const bothAbsent = lastTwo.slice(0,2).every((r:any)=> (r.status === 'absent'));
            if (bothAbsent) {
              const reason = (lastTwo[0].absence_reason ?? lastTwo[0].absenceReason) || 'Repeated absence';
              await createFollowUpIfNotExists(rec.memberId, selectedGroup, leaderUserId, reason);
            }
          }
        } catch {}
      }
      toast({ title: 'Success', description: 'Attendance saved successfully' });
      // Build WhatsApp lists from current in-memory state
      const absLinesNow = members
        .filter(m => (attendance[m.id]?.status || 'absent') === 'absent')
        .map(m => {
          const reason = attendance[m.id]?.absenceReason ? ` (${attendance[m.id]?.absenceReason})` : '';
          return `${m.name} - ${m.phone}${reason}`;
        })
        .filter(Boolean) as string[];
      const presLinesNow = members
        .filter(m => (attendance[m.id]?.status || 'absent') === 'present')
        .map(m => `${m.name} - ${m.phone}`)
        .filter(Boolean) as string[];
      const groupNameNow = ((groups.length ? groups : []).find((g: any) => g.id === selectedGroup)?.name) || 'Group';
      setWaAbsentPreview([`${groupNameNow} - Absent ${dateStr}`, ...absLinesNow].join('\n'));
      setWaPresentPreview([`${groupNameNow} - Present ${dateStr}`, ...presLinesNow].join('\n'));
      setWaDialogOpen(true);
      return;
    } catch (_) {
      // Do not fall back to local storage; report error and stop
      toast({ title: 'Error', description: 'Failed to save attendance online', variant: 'destructive' });
      return;
    }
  };

  const allMarked = members.every(m => attendance[m.id]?.status);
  const hasInvalidAbsent = Object.values(attendance).some(
    a => a.status === 'absent' && !a.absenceReason.trim()
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Mark Attendance
          </h1>
          {user.role === 'admin' ? (
            <div className="max-w-xs">
              <Label>Select Group</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {(groups.length ? groups : []).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-muted-foreground text-lg">{group?.name}</p>
          )}
        </div>

        <Card className="mb-6 card-hover border-primary/20 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Select Date
            </CardTitle>
            <CardDescription>Choose the meeting date for attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-primary" />
              Member Attendance
            </CardTitle>
            <CardDescription>Mark present or absent for each member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.map(member => {
              const memberAttendance = attendance[member.id];
              return (
                <div key={member.id} className="p-5 border rounded-xl hover:border-primary/50 hover:shadow-md transition-all duration-300 space-y-4 bg-card">
                  <div>
                    <h3 className="font-semibold text-lg">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.phone}</p>
                  </div>

                  <RadioGroup
                    value={memberAttendance?.status}
                    onValueChange={(value) => handleStatusChange(member.id, value as 'present' | 'absent')}
                  >
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="present" id={`${member.id}-present`} />
                        <Label htmlFor={`${member.id}-present`} className="cursor-pointer">
                          Present
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="absent" id={`${member.id}-absent`} />
                        <Label htmlFor={`${member.id}-absent`} className="cursor-pointer">
                          Absent
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  {memberAttendance?.status === 'absent' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label>Reason for absence <span className="text-destructive">*</span></Label>
                      <Select
                        onValueChange={(value) => handleReasonChange(member.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a preset reason (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {absenceReasons.map((r) => (
                            <SelectItem key={r.id} value={r.label}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        id={`${member.id}-reason`}
                        placeholder="Add details or custom reason..."
                        value={memberAttendance.absenceReason}
                        onChange={(e) => handleReasonChange(member.id, e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              className="w-full gap-3 h-14 text-base shadow-glow hover:shadow-xl transition-all"
              size="lg"
              onClick={handleSubmit}
              disabled={!allMarked || hasInvalidAbsent}
            >
              <Save className="w-5 h-5" />
              Save Attendance
            </Button>
          </CardContent>
        </Card>
        <Dialog open={waDialogOpen} onOpenChange={(o) => {
          setWaDialogOpen(o);
          if (!o) navigate('/leader');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>WhatsApp Lists</DialogTitle>
              <DialogDescription>Quickly copy absent or present lists for today</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={async () => {
                    const ok = await copyText(waAbsentPreview);
                    if (ok) toast({ title: 'Copied', description: 'Absent list copied' }); else toast({ title: 'Copy failed', description: 'Select and copy manually', variant: 'destructive' });
                  }}
                  disabled={!waAbsentPreview}
                >
                  Copy Absent List
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const ok = await copyText(waPresentPreview);
                    if (ok) toast({ title: 'Copied', description: 'Present list copied' }); else toast({ title: 'Copy failed', description: 'Select and copy manually', variant: 'destructive' });
                  }}
                  disabled={!waPresentPreview}
                >
                  Copy Present List
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border p-2 text-xs bg-muted whitespace-pre-wrap min-h-[80px]">
                  {waAbsentPreview}
                </div>
                <div className="rounded-md border p-2 text-xs bg-muted whitespace-pre-wrap min-h-[80px]">
                  {waPresentPreview}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setWaDialogOpen(false)}>Done</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AttendanceMarking;