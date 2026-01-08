import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FollowUpTask } from '@/lib/mockData';
import { getCurrentUser } from '@/lib/session';
import { useToast } from '@/hooks/use-toast';
import { listFollowUpsByGroup, completeFollowUp, reopenFollowUp, fetchMembersByGroup } from '@/lib/api';

const LeaderFollowUps = () => {
  const { toast } = useToast();
  const user = getCurrentUser();

  if (!user || user.role !== 'leader') {
    return <div>Access denied</div>;
  }

  const myGroupId = user.careGroupId!;
  const [openTasks, setOpenTasks] = useState<FollowUpTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<FollowUpTask[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const refresh = async () => {
    try {
      const all = await listFollowUpsByGroup(myGroupId);
      const done = all
        .filter((f: any) => f.status === 'done')
        .sort((a: any, b: any) => new Date(b.completedAt || b.completed_at || 0).getTime() - new Date(a.completedAt || a.completed_at || 0).getTime())
        .slice(0, 30) as FollowUpTask[];
      const open = all.filter((f: any) => f.status === 'open') as FollowUpTask[];
      setOpenTasks(open.map((o:any)=> ({ ...o, createdAt: (o as any).createdAt || (o as any).created_at })) as FollowUpTask[]);
      // normalize completedAt field name if coming from Supabase
      setDoneTasks(done.map((d: any) => ({ ...d, completedAt: d.completedAt || d.completed_at })) as FollowUpTask[]);
      // load members for this group for name/phone rendering
      try {
        const ms = await fetchMembersByGroup(myGroupId);
        setMembers(ms.map((m: any) => ({ id: m.id, name: m.name, phone: m.phone || '' })));
      } catch {
        setMembers([]);
      }
    } catch (e: any) {
      toast({ title: 'Failed to load follow-ups', description: e?.message || 'Please check connection', variant: 'destructive' });
    }
  };
  useEffect(() => { refresh(); }, [myGroupId]);
  const [tab, setTab] = useState<'open' | 'done'>('open');

  const handleComplete = async (task: FollowUpTask) => {
    try {
      await completeFollowUp(task.id);
      toast({ title: 'Follow-up completed', description: 'Task marked as done' });
      await refresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Could not complete task', variant: 'destructive' });
    }
  };
  const handleReopen = async (task: FollowUpTask) => {
    try {
      await reopenFollowUp(task.id);
      toast({ title: 'Follow-up re-opened', description: 'Task moved back to open' });
      await refresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Could not re-open task', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Follow-ups
          </h1>
          <p className="text-muted-foreground text-lg">Members needing attention due to repeated absences</p>
        </div>

        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Follow-up Tasks</CardTitle>
                <CardDescription>Open and completed follow-ups for your group</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant={tab === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setTab('open')}>Open</Button>
                <Button variant={tab === 'done' ? 'default' : 'outline'} size="sm" onClick={() => setTab('done')}>Completed</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tab === 'open' ? (
              <div className="space-y-3">
                {openTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No open follow-up tasks 🎉</p>
                )}
                {openTasks.map(task => {
                  const member = members.find(m => m.id === task.memberId);
                  return (
                    <div key={task.id} className="p-4 border rounded-xl flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{member?.name}</div>
                        <div className="text-sm text-muted-foreground">{member?.phone}</div>
                        <div className="text-sm mt-2">Reason: <span className="font-medium">{task.reason}</span></div>
                        <div className="text-xs text-muted-foreground">Created {new Date((task as any).createdAt || (task as any).created_at).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleComplete(task)}>Mark Done</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {doneTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No completed follow-ups yet.</p>
                )}
                {doneTasks.map(task => {
                  const member = members.find(m => m.id === task.memberId);
                  return (
                    <div key={task.id} className="p-4 border rounded-xl flex items-start justify-between gap-4 bg-muted/50">
                      <div>
                        <div className="font-semibold">{member?.name}</div>
                        <div className="text-sm text-muted-foreground">{member?.phone}</div>
                        <div className="text-sm mt-2">Reason: <span className="font-medium">{task.reason}</span></div>
                        {(task as any).completedAt && (
                          <div className="text-xs text-muted-foreground">Completed {new Date((task as any).completedAt).toLocaleString()}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleReopen(task)}>Re-open</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderFollowUps;
