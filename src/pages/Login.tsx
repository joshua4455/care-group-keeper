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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Care Group Attendance</CardTitle>
          <CardDescription>Select your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {data.users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      <span>{user.name}</span>
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
            className="w-full" 
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