import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getStoredData, saveData, getCurrentUser, AttendanceRecord } from '@/lib/mockData';
import { CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface MemberAttendance {
  memberId: string;
  status: 'present' | 'absent';
  absenceReason: string;
}

const AttendanceMarking = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const data = getStoredData();
  const user = getCurrentUser();

  const [date, setDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, MemberAttendance>>({});

  if (!user || user.role !== 'leader') {
    return <div>Access denied</div>;
  }

  const members = data.members.filter(m => m.careGroupId === user.careGroupId);
  const group = data.careGroups.find(g => g.id === user.careGroupId);

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

  const handleSubmit = () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const updatedData = { ...data };

    // Remove existing attendance for this date and group
    updatedData.attendance = updatedData.attendance.filter(
      a => !(a.date === dateStr && a.careGroupId === user.careGroupId)
    );

    // Add new attendance records
    Object.values(attendance).forEach(att => {
      if (att.status === 'absent' && !att.absenceReason.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter absence reason for all absent members',
          variant: 'destructive',
        });
        return;
      }

      updatedData.attendance.push({
        id: `att${Date.now()}${Math.random()}`,
        date: dateStr,
        memberId: att.memberId,
        careGroupId: user.careGroupId!,
        status: att.status,
        absenceReason: att.status === 'absent' ? att.absenceReason : undefined,
      });
    });

    saveData(updatedData);
    toast({
      title: 'Success',
      description: 'Attendance saved successfully',
    });
    navigate('/leader');
  };

  const allMarked = members.every(m => attendance[m.id]?.status);
  const hasInvalidAbsent = Object.values(attendance).some(
    a => a.status === 'absent' && !a.absenceReason.trim()
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Mark Attendance</h1>
          <p className="text-muted-foreground">{group?.name}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Member Attendance</CardTitle>
            <CardDescription>Mark present or absent for each member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {members.map(member => {
              const memberAttendance = attendance[member.id];
              return (
                <div key={member.id} className="p-4 border rounded-lg space-y-4">
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
                      <Label htmlFor={`${member.id}-reason`}>
                        Reason for absence <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id={`${member.id}-reason`}
                        placeholder="Please type the reason for absence..."
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
              className="w-full gap-2"
              size="lg"
              onClick={handleSubmit}
              disabled={!allMarked || hasInvalidAbsent}
            >
              <Save className="w-4 h-4" />
              Save Attendance
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceMarking;