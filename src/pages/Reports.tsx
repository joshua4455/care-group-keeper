import { useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrentUser } from '@/lib/session';
import { fetchCareGroups, fetchAllAttendance, fetchAllMembers } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, TrendingUp, Users, AlertCircle } from 'lucide-react';

const Reports = () => {
  const user = getCurrentUser();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [groups, setGroups] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    (async () => {
      try {
        const gs = await fetchCareGroups();
        setGroups(gs);
        if (!isAdmin) {
          setSelectedGroupId(user?.careGroupId || '');
        }
      } catch {
        setGroups([]);
      }
      try {
        const ats = await fetchAllAttendance();
        setAttendance(ats);
      } catch {
        setAttendance([]);
      }
      try {
        const ms = await fetchAllMembers();
        setMembers(ms);
      } catch {
        setMembers([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableGroups = useMemo(() => {
    return isAdmin ? groups : groups.filter(g => g.id === user?.careGroupId);
  }, [groups, isAdmin, user?.careGroupId]);

  const filteredAttendance = useMemo(() => {
    const arr = attendance.map((a: any) => ({
      id: a.id,
      date: a.date,
      status: a.status,
      absenceReason: a.absence_reason ?? a.absenceReason,
      memberId: a.member_id ?? a.memberId,
      careGroupId: a.care_group_id ?? a.careGroupId,
    }));
    if (isAdmin && selectedGroupId === 'all') return arr;
    const gid = isAdmin ? selectedGroupId : user?.careGroupId;
    return arr.filter(a => a.careGroupId === gid);
  }, [attendance, isAdmin, selectedGroupId, user?.careGroupId]);

  // Calculate stats
  const totalRecords = filteredAttendance.length;
  const presentCount = filteredAttendance.filter(a => a.status === 'present').length;
  const absentCount = filteredAttendance.filter(a => a.status === 'absent').length;
  const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  // Get recent absences with reasons
  const recentAbsences = filteredAttendance
    .filter(a => a.status === 'absent')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(a => {
      const member = members.find((m: any) => m.id === (a as any).memberId);
      const group = groups.find((g: any) => g.id === (a as any).careGroupId);
      return { ...a, memberName: member?.name, groupName: group?.name };
    });

  // Calculate attendance by date for chart
  const attendanceByDate = filteredAttendance.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = { date: record.date, present: 0, absent: 0 };
    }
    if (record.status === 'present') {
      acc[record.date].present++;
    } else {
      acc[record.date].absent++;
    }
    return acc;
  }, {} as Record<string, { date: string; present: number; absent: number }>);

  const chartData = Object.values(attendanceByDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Attendance Reports
          </h1>
          <p className="text-muted-foreground text-lg">View attendance statistics and trends</p>
        </div>

        {isAdmin && (
          <div className="mb-6">
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select care group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {availableGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Total Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{totalRecords}</div>
            </CardContent>
          </Card>
          <Card className="card-hover border-primary/20 shadow-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Present
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">
                {presentCount}
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Absent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-destructive">{absentCount}</div>
            </CardContent>
          </Card>
          <Card className="card-hover border-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-secondary">{attendanceRate}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="w-5 h-5 text-primary" />
                Attendance Trend
              </CardTitle>
              <CardDescription>Last 10 meetings</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="present" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="absent" stackId="a" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No attendance data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Recent Absences
              </CardTitle>
              <CardDescription>Members who were absent with reasons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {recentAbsences.length > 0 ? (
                  recentAbsences.map(absence => (
                    <div key={absence.id} className="p-4 border rounded-xl hover:border-destructive/50 hover:bg-accent/50 transition-all duration-300 hover:shadow-md">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{absence.memberName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(absence.date).toLocaleDateString()}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="text-sm text-muted-foreground mb-1">{absence.groupName}</div>
                      )}
                      <div className="text-sm bg-muted p-2 rounded">
                        {absence.absenceReason}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No absences recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;