import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredData, setCurrentUser, User } from '@/lib/mockData';
import { Users, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const data = getStoredData();

  const handleLogin = () => {
    const user = data.users.find(u => u.id === selectedUserId);
    if (user) {
      setCurrentUser(user);
      toast({
        title: 'Welcome!',
        description: `Logged in as ${user.name}`,
      });
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/leader');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md card-hover shadow-glow border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-2 w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-in zoom-in duration-500">
            <Users className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Care Group Attendance
          </CardTitle>
          <CardDescription className="text-base">Select your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Select User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-12 border-primary/20 hover:border-primary/40 transition-colors">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {data.users.map(user => (
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
          <Button 
            className="w-full h-12 text-base shadow-glow hover:shadow-xl transition-all" 
            onClick={handleLogin}
            disabled={!selectedUserId}
          >
            Login
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Demo mode: No password required
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;