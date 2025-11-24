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
    setNewGroup({ name: '', leaderId: '' });
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
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">Manage care groups, leaders, and members</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover border-primary/20 shadow-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                Care Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">
                {stats.totalGroups}
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover border-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Leaders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-secondary">
                {stats.totalLeaders}
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {stats.totalMembers}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-primary" />
                    Care Groups
                  </CardTitle>
                  <CardDescription>Manage your care groups</CardDescription>
                </div>
                <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 shadow-glow">
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
                          placeholder="e.g., Sunday Care Group, Monday Care Group"
                        />
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
                      <p className="text-sm text-muted-foreground">All groups meet on Sunday after service</p>
                      <Button onClick={handleCreateGroup} className="w-full">Create Group</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.careGroups.map(group => {
                  const leader = data.users.find(u => u.id === group.leaderId);
                  const memberCount = data.members.filter(m => m.careGroupId === group.id).length;
                  return (
                    <div key={group.id} className="p-4 border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-all duration-300 hover:shadow-md group">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {group.name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Leader: {leader?.name} • {memberCount} members
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Members
                  </CardTitle>
                  <CardDescription>All care group members</CardDescription>
                </div>
                <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 shadow-glow">
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
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.members.map(member => {
                  const group = data.careGroups.find(g => g.id === member.careGroupId);
                  return (
                    <div key={member.id} className="p-4 border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-all duration-300 hover:shadow-md group">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {member.name}
                      </div>
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