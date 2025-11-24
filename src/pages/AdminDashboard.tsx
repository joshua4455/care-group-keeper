import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredData, saveData, AppData, CareGroup, Member, User } from '@/lib/mockData';
import { Plus, Users, UserPlus, FolderPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const [data, setData] = useState<AppData>(getStoredData());
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isLeaderDialogOpen, setIsLeaderDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newGroup, setNewGroup] = useState({
    name: '',
    meetingDay: 'Wednesday' as CareGroup['meetingDay'],
    leaderId: '',
  });

  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    careGroupId: '',
  });

  const [newLeader, setNewLeader] = useState({
    name: '',
    careGroupId: '',
  });

  const refreshData = () => {
    setData(getStoredData());
  };

  const handleCreateGroup = () => {
    if (!newGroup.name || !newGroup.leaderId) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const updatedData = { ...data };
    const groupId = `group${Date.now()}`;
    updatedData.careGroups.push({
      id: groupId,
      ...newGroup,
    });

    const leaderIndex = updatedData.users.findIndex(u => u.id === newGroup.leaderId);
    if (leaderIndex !== -1) {
      updatedData.users[leaderIndex].careGroupId = groupId;
    }

    saveData(updatedData);
    refreshData();
    setNewGroup({ name: '', meetingDay: 'Wednesday', leaderId: '' });
    setIsGroupDialogOpen(false);
    toast({ title: 'Success', description: 'Care group created' });
  };

  const handleAddMember = () => {
    if (!newMember.name || !newMember.phone || !newMember.careGroupId) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const updatedData = { ...data };
    updatedData.members.push({
      id: `member${Date.now()}`,
      ...newMember,
    });

    saveData(updatedData);
    refreshData();
    setNewMember({ name: '', phone: '', careGroupId: '' });
    setIsMemberDialogOpen(false);
    toast({ title: 'Success', description: 'Member added' });
  };

  const handleAddLeader = () => {
    if (!newLeader.name) {
      toast({ title: 'Error', description: 'Please enter leader name', variant: 'destructive' });
      return;
    }

    const updatedData = { ...data };
    updatedData.users.push({
      id: `leader${Date.now()}`,
      name: newLeader.name,
      role: 'leader',
      careGroupId: newLeader.careGroupId || undefined,
    });

    saveData(updatedData);
    refreshData();
    setNewLeader({ name: '', careGroupId: '' });
    setIsLeaderDialogOpen(false);
    toast({ title: 'Success', description: 'Leader added' });
  };

  const stats = {
    totalGroups: data.careGroups.length,
    totalMembers: data.members.length,
    totalLeaders: data.users.filter(u => u.role === 'leader').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage care groups, leaders, and members</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Care Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.totalGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leaders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.totalLeaders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.totalMembers}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Care Groups</CardTitle>
                  <CardDescription>Manage your care groups</CardDescription>
                </div>
                <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Care Group</DialogTitle>
                      <DialogDescription>Add a new care group to the system</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Group Name</Label>
                        <Input
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                          placeholder="Wednesday Evening Group"
                        />
                      </div>
                      <div>
                        <Label>Meeting Day</Label>
                        <Select
                          value={newGroup.meetingDay}
                          onValueChange={(value) => setNewGroup({ ...newGroup, meetingDay: value as CareGroup['meetingDay'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                              <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Assign Leader</Label>
                        <Select
                          value={newGroup.leaderId}
                          onValueChange={(value) => setNewGroup({ ...newGroup, leaderId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a leader" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.users.filter(u => u.role === 'leader' && !u.careGroupId).map(leader => (
                              <SelectItem key={leader.id} value={leader.id}>{leader.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateGroup} className="w-full">Create Group</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.careGroups.map(group => {
                  const leader = data.users.find(u => u.id === group.leaderId);
                  const memberCount = data.members.filter(m => m.careGroupId === group.id).length;
                  return (
                    <div key={group.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {group.meetingDay} • Leader: {leader?.name} • {memberCount} members
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>All care group members</CardDescription>
                </div>
                <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Member</DialogTitle>
                      <DialogDescription>Add a new member to a care group</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newMember.name}
                          onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={newMember.phone}
                          onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                          placeholder="555-0123"
                        />
                      </div>
                      <div>
                        <Label>Care Group</Label>
                        <Select
                          value={newMember.careGroupId}
                          onValueChange={(value) => setNewMember({ ...newMember, careGroupId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a group" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.careGroups.map(group => (
                              <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddMember} className="w-full">Add Member</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.members.map(member => {
                  const group = data.careGroups.find(g => g.id === member.careGroupId);
                  return (
                    <div key={member.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {member.phone} • {group?.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;