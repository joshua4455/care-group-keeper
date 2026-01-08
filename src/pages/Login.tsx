import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { setCurrentUser } from '@/lib/session';
import { Users, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { listUsers, loginLocalOrSupabase } from '@/lib/api';

const Login = () => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [resetOpen, setResetOpen] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [newUserPwd, setNewUserPwd] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryNewPwd, setRecoveryNewPwd] = useState('');
  const [recoveryPreview, setRecoveryPreview] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await listUsers();
        setUsers(u);
      } catch (e: any) {
        toast({ title: 'Failed to load users', description: e?.message || 'Please check your connection', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogin = async () => {
    try {
      const selected = users.find(u => u.id === selectedUserId);
      if (!selected) { toast({ title: 'Select a user', description: 'Choose a user to continue', variant: 'destructive' }); return; }
      const authed = await loginLocalOrSupabase(selected.name, password);
      // Persist to app session (local mechanism used throughout the app)
      setCurrentUser({
        id: authed.id,
        name: authed.name,
        role: authed.role,
        careGroupId: authed.care_group_id ?? authed.careGroupId,
        password: authed.password ?? authed.password_hash, // local fallback only
      } as any);
      toast({ title: 'Welcome!', description: `Logged in as ${authed.name}` });
      if (authed.role === 'admin') navigate('/admin'); else navigate('/leader');
    } catch (e: any) {
      toast({ title: 'Invalid credentials', description: e?.message || 'Please try again', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md card-hover shadow-glow border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-2 w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-in zoom-in duration-500 overflow-hidden">
            <img src="/logo12.png" alt="Care Group Keeper" className="w-14 h-14 object-contain" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Care Group Attendance
          </CardTitle>
          <CardDescription className="text-base">Select your account and enter your password to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Select User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-12 border-primary/20 hover:border-primary/40 transition-colors">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id} className="cursor-pointer">
                    <div className="flex items-center gap-2 py-1">
                      <UserCircle className="w-4 h-4" />
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({user.role})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="h-12"
            />
          </div>
          <Button 
            className="w-full h-12 text-base shadow-glow hover:shadow-xl transition-all" 
            onClick={handleLogin}
            disabled={!selectedUserId || password.length === 0}
          >
            Login
          </Button>
          {!loading && users.length === 0 && (
            <p className="text-xs text-center text-muted-foreground">No users found. Create an admin account first.</p>
          )}
          <div className="flex justify-center">
            <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">Forgot password?</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Password help</DialogTitle>
                  <DialogDescription>
                    Please contact an administrator to reset your password. For dev, you can update the user in the Supabase users table.
                  </DialogDescription>
                </DialogHeader>
                <div className="text-xs text-muted-foreground">
                  Admins can change their password from the app header (Navigation → Change Password).
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;