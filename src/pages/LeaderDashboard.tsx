import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStoredData, getCurrentUser } from '@/lib/mockData';
import { ClipboardCheck, Users, Calendar } from 'lucide-react';
const LeaderDashboard = () => {
  const navigate = useNavigate();
  const data = getStoredData();
  const user = getCurrentUser();
  if (!user || user.role !== 'leader') {
    return <div>Access denied</div>;
  }
  const group = data.careGroups.find(g => g.id === user.careGroupId);
  const members = data.members.filter(m => m.careGroupId === user.careGroupId);
  const recentAttendance = data.attendance.filter(a => a.careGroupId === user.careGroupId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const lastMeetingDate = recentAttendance.length > 0 ? recentAttendance[0].date : null;
  const presentCount = recentAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = members.length > 0 ? Math.round(presentCount / members.length * 100) : 0;
  return <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Care Group
          </h1>
          <p className="text-muted-foreground text-lg">{group?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover border-primary/20 shadow-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">
                {members.length}
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover border-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Day






            </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">Sunday</div>
              <p className="text-sm text-muted-foreground mt-1">After service</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Last Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {lastMeetingDate ? new Date(lastMeetingDate).toLocaleDateString() : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="w-6 h-6 text-primary" />
                Group Members
              </CardTitle>
              <CardDescription>All members in your care group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members.map(member => <div key={member.id} className="p-4 border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-all duration-300 hover:shadow-md group">
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{member.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{member.phone}</div>
                  </div>)}
                {members.length === 0 && <p className="text-center text-muted-foreground py-8">No members yet</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="w-6 h-6 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Manage attendance for your group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-3 h-14 text-base shadow-glow hover:shadow-xl transition-all" size="lg" onClick={() => navigate('/leader/attendance')}>
                <ClipboardCheck className="w-5 h-5" />
                Mark Today's Attendance
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-14 text-base hover:border-primary/50 hover:bg-accent transition-all" size="lg" onClick={() => navigate('/leader/reports')}>
                <Calendar className="w-5 h-5" />
                View Attendance History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default LeaderDashboard;