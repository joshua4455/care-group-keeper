import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getCurrentUser, logout } from '@/lib/mockData';
import { LogOut, Users, LayoutDashboard, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Navigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getCurrentUser();

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
              <Users className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">Care Groups</span>
            </div>
            <div className="hidden md:flex gap-2">
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
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.name}
            </span>
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