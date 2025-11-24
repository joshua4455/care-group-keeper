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

  const recentAttendance = data.attendance
    .filter(a => a.careGroupId === user.careGroupId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const lastMeetingDate = recentAttendance.length > 0 ? recentAttendance[0].date : null;
  const presentCount = recentAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = members.length > 0 ? Math.round((presentCount / members.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Care Group</h1>
          <p className="text-muted-foreground">{group?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{members.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Meeting Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{group?.meetingDay}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {lastMeetingDate ? new Date(lastMeetingDate).toLocaleDateString() : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Group Members
              </CardTitle>
              <CardDescription>All members in your care group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.phone}</div>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No members yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Manage attendance for your group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                size="lg"
                onClick={() => navigate('/leader/attendance')}
              >
                <ClipboardCheck className="w-5 h-5" />
                Mark Today's Attendance
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                size="lg"
                onClick={() => navigate('/leader/reports')}
              >
                <Calendar className="w-5 h-5" />
                View Attendance History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeaderDashboard;