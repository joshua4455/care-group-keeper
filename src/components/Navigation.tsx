import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getCurrentUser, logout } from '@/lib/session';
import { LogOut, LayoutDashboard, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPendingCount, processQueue } from '@/lib/sync';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { loginLocalOrSupabase, updateUserPassword } from '@/lib/api';
import { Input } from '@/components/ui/input';

export const Navigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pending, setPending] = useState<number>(getPendingCount());
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setPending(getPendingCount());
    };
    const onOnline = async () => {
      setOnline(true);
      const { processed } = await processQueue();
      setPending(getPendingCount());
      if (processed > 0) {
        toast({ title: 'Synced', description: `${processed} pending action(s) processed.` });
      }
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // initial attempt to process any pending queue if online
    if (navigator.onLine) {
      onOnline();
    } else {
      update();
    }
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [toast]);

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out',
      description: 'See you next time!',
    });
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo12.png" alt="Care Groups" className="h-8 w-auto" />
              <span className="font-semibold text-lg">Care Groups</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {user.role === 'admin' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin/reports')}
                    className="gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Reports
                  </Button>
                </>
              )}
              {user.role === 'leader' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/leader')}
                    className="gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    My Group
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/leader/attendance')}
                    className="gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Mark Attendance
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/leader/followups')}
                    className="gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Follow-ups
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2">
              <span className={online ? 'text-green-600' : 'text-red-600'}>
                {online ? 'Online' : 'Offline'}
              </span>
              {pending > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                  {pending} pending
                </span>
              )}
              {online && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { processed } = await processQueue();
                    setPending(getPendingCount());
                    toast({ title: processed > 0 ? 'Synced' : 'Up to date', description: processed > 0 ? `${processed} action(s) processed.` : 'No pending actions.' });
                  }}
                >
                  Retry Sync
                </Button>
              )}
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.name}
            </span>
            {user.role === 'admin' && (
              <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Change Password</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>Update your account password</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Current password</label>
                      <Input type="password" value={currPwd} onChange={(e) => setCurrPwd(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">New password</label>
                      <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Confirm new password</label>
                      <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setPwdOpen(false)}>Cancel</Button>
                      <Button
                        onClick={async () => {
                          try {
                            if (!newPwd || newPwd.length < 4) {
                              toast({ title: 'Weak password', description: 'Use at least 4 characters', variant: 'destructive' });
                              return;
                            }
                            if (newPwd !== confirmPwd) {
                              toast({ title: 'Mismatch', description: 'New password and confirmation do not match', variant: 'destructive' });
                              return;
                            }
                            // Verify current password via backend (phase 1: table users)
                            try {
                              await loginLocalOrSupabase(user.name, currPwd);
                            } catch {
                              toast({ title: 'Incorrect password', description: 'Current password is wrong', variant: 'destructive' });
                              return;
                            }
                            await updateUserPassword(user.id, newPwd);
                            toast({ title: 'Password updated', description: 'Your password has been changed' });
                            setPwdOpen(false);
                            setCurrPwd(''); setNewPwd(''); setConfirmPwd('');
                          } catch (e: any) {
                            toast({ title: 'Error', description: e?.message || 'Could not update password', variant: 'destructive' });
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};