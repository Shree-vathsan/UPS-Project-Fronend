import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Trash2, UserPlus, Shield, User, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { API_BASE_URL } from '../config';
import { useUserRole } from '../hooks/useRoleManagement';

interface TeamsTabProps {
    repositoryId: string;
}

interface TeamMember {
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    email?: string;
    role: 'team_leader' | 'contributor';
    createdAt: string;
}

interface Team {
    id: string;
    name: string;
    repositoryId: string;
    createdByUsername?: string;
    members: TeamMember[];
    createdAt: string;
    updatedAt: string;
}

interface RepositoryUser {
    id: string;
    authorName: string;
    email?: string;
    avatarUrl?: string;
}

export function TeamsTab({ repositoryId }: TeamsTabProps) {
    // Memoize user to prevent infinite loops
    const user = useMemo(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : {};
    }, []);

    const userId = user?.id || localStorage.getItem('userId') || '';

    // Use role detection - owners and admins can manage all teams
    const { data: userRole } = useUserRole(repositoryId, userId);
    const canManageAllTeams = (userRole?.isOwner || userRole?.isAdmin) ?? false;

    // Check if current user is team leader of a specific team
    const isTeamLeaderOf = (team: Team) => {
        return team.members.some(
            m => m.userId === userId && m.role === 'team_leader'
        );
    };

    // Check if user can manage a specific team (admin/owner OR team leader of that team)
    const canManageTeam = (team: Team) => {
        return canManageAllTeams || isTeamLeaderOf(team);
    };

    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [repositoryUsers, setRepositoryUsers] = useState<RepositoryUser[]>([]);

    // Modals
    const [createTeamOpen, setCreateTeamOpen] = useState(false);
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    // Form states
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState<'team_leader' | 'contributor'>('contributor');

    // Delete confirmation states
    const [deleteTeamConfirm, setDeleteTeamConfirm] = useState<Team | null>(null);
    const [removeMemberConfirm, setRemoveMemberConfirm] = useState<{ teamId: string; memberId: string; memberName: string } | null>(null);

    useEffect(() => {
        if (repositoryId && userId) {
            fetchTeams();
            fetchRepositoryUsers();
        }
    }, [repositoryId, userId]); // Fixed: use userId instead of user object

    const fetchTeams = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/repositories/${repositoryId}/teams?userId=${userId}`,
                { credentials: 'include' }
            );
            const data = await response.json();
            setTeams(data.teams || []);
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRepositoryUsers = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/repositories/${repositoryId}/users`,
                { credentials: 'include' }
            );
            const data = await response.json();
            setRepositoryUsers(data || []);
        } catch (error) {
            console.error('Error fetching repository users:', error);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim() || !user) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/repositories/${repositoryId}/teams?userId=${user.id}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name: newTeamName }),
                }
            );

            if (response.ok) {
                setNewTeamName('');
                setCreateTeamOpen(false);
                fetchTeams();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to create team');
            }
        } catch (error) {
            console.error('Error creating team:', error);
            alert('Failed to create team');
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!user) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/repositories/${repositoryId}/teams/${teamId}?userId=${user.id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (response.ok) {
                fetchTeams();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete team');
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            alert('Failed to delete team');
        } finally {
            setDeleteTeamConfirm(null);
        }
    };

    const handleAddMember = async () => {
        if (!selectedTeam || !selectedUserId || !user) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/repositories/${repositoryId}/teams/${selectedTeam.id}/members?userId=${user.id}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        userId: selectedUserId,
                        role: selectedRole,
                    }),
                }
            );

            if (response.ok) {
                setAddMemberOpen(false);
                setSelectedUserId('');
                setSelectedRole('contributor');
                fetchTeams();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to add member');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Failed to add member');
        }
    };

    const handleRemoveMember = async (teamId: string, memberId: string) => {
        if (!user) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/repositories/${repositoryId}/teams/${teamId}/members/${memberId}?userId=${user.id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (response.ok) {
                fetchTeams();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Failed to remove member');
        } finally {
            setRemoveMemberConfirm(null);
        }
    };

    const handleUpdateRole = async (teamId: string, memberId: string, newRole: 'team_leader' | 'contributor') => {
        if (!user) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/repositories/${repositoryId}/teams/${teamId}/members/${memberId}/role?userId=${user.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ role: newRole }),
                }
            );

            if (response.ok) {
                fetchTeams();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update role');
            }
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Team Cards Skeleton */}
                <div className="grid gap-4">
                    {[1, 2].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <Skeleton className="h-6 w-40 mb-2" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="h-9 w-28" />
                                        <Skeleton className="h-9 w-9" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {[1, 2, 3].map((j) => (
                                        <div key={j} className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-8 w-8 rounded-full" />
                                                <div>
                                                    <Skeleton className="h-4 w-32 mb-1" />
                                                    <Skeleton className="h-3 w-20" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Skeleton className="h-8 w-24" />
                                                <Skeleton className="h-8 w-8" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-heading text-2xl font-semibold">Teams</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Organize contributors into teams with designated leaders
                    </p>
                </div>
                {canManageAllTeams && (
                    <Button onClick={() => setCreateTeamOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Team
                    </Button>
                )}
            </div>

            {/* Access Notice - show only if user has no management capability */}
            {!canManageAllTeams && teams.length === 0 && !teams.some(t => isTeamLeaderOf(t)) && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-heading text-lg font-semibold mb-2">Admin Access Required</h3>
                        <p className="text-muted-foreground text-sm">
                            Only repository owners and admins can create and manage teams.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Teams List */}
            {teams.length === 0 && canManageAllTeams && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-heading text-lg font-semibold mb-2">No Teams Yet</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Create your first team to organize contributors
                        </p>
                        <Button onClick={() => setCreateTeamOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Team
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {teams.map((team) => (
                    <Card key={team.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        {team.name}
                                    </CardTitle>
                                    <CardDescription>
                                        {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                                        {team.createdByUsername && ` · Created by ${team.createdByUsername}`}
                                    </CardDescription>
                                </div>
                                {/* Team management buttons - visible to admins OR team leaders */}
                                {canManageTeam(team) && (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => {
                                                setSelectedTeam(team);
                                                setAddMemberOpen(true);
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            Add Member
                                        </Button>
                                        {/* Only admins/owners can delete teams */}
                                        {canManageAllTeams && (
                                            <Button
                                                onClick={() => setDeleteTeamConfirm(team)}
                                                variant="destructive"
                                                size="sm"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {team.members.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No members yet. Add members to this team.
                                    </p>
                                ) : (
                                    team.members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                    {member.username?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{member.username}</span>
                                                    <Badge
                                                        variant={member.role === 'team_leader' ? 'default' : 'secondary'}
                                                    >
                                                        {member.role === 'team_leader' ? (
                                                            <>
                                                                <Shield className="h-3 w-3 mr-1" />
                                                                Team Leader
                                                            </>
                                                        ) : (
                                                            <>
                                                                <User className="h-3 w-3 mr-1" />
                                                                Contributor
                                                            </>
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {/* Member management - visible to admins OR team leaders for non-leader members */}
                                            {(canManageAllTeams || (isTeamLeaderOf(team) && member.role !== 'team_leader')) && (
                                                <div className="flex gap-2">
                                                    {/* Role dropdown - only visible to admins/owners */}
                                                    {canManageAllTeams && (
                                                        <select
                                                            value={member.role}
                                                            onChange={(e) =>
                                                                handleUpdateRole(team.id, member.id, e.target.value as any)
                                                            }
                                                            className="px-2 py-1 text-sm border rounded bg-background text-foreground"
                                                        >
                                                            <option value="team_leader">Team Leader</option>
                                                            <option value="contributor">Contributor</option>
                                                        </select>
                                                    )}
                                                    <Button
                                                        onClick={() => setRemoveMemberConfirm({ teamId: team.id, memberId: member.id, memberName: member.username })}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hover:bg-destructive hover:text-destructive-foreground"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Create Team Modal */}
            {createTeamOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCreateTeamOpen(false)}>
                    <Card className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Create New Team</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setCreateTeamOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription>Create a team to organize contributors for this repository</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team Name</label>
                                <Input
                                    placeholder="e.g., Frontend Team"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setCreateTeamOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
                                    Create Team
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Member Modal */}
            {addMemberOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAddMemberOpen(false)}>
                    <Card className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Add Team Member</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setAddMemberOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription>Add a contributor to {selectedTeam?.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select User</label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-3 py-2 border rounded bg-background text-foreground"
                                >
                                    <option value="">Choose a user...</option>
                                    {repositoryUsers
                                        .filter(
                                            (u) =>
                                                !selectedTeam?.members.some((m) => m.userId === u.id)
                                        )
                                        .map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.authorName}
                                                {user.email && ` (${user.email})`}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as any)}
                                    className="w-full px-3 py-2 border rounded bg-background text-foreground"
                                >
                                    <option value="contributor">Contributor</option>
                                    {/* Only admins/owners can assign team leader role */}
                                    {canManageAllTeams && (
                                        <option value="team_leader">Team Leader</option>
                                    )}
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddMember} disabled={!selectedUserId}>
                                    Add Member
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delete Team Confirmation Dialog */}
            <AlertDialog open={!!deleteTeamConfirm} onOpenChange={(open) => !open && setDeleteTeamConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the team "{deleteTeamConfirm?.name}"? This action cannot be undone and all team members will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTeamConfirm && handleDeleteTeam(deleteTeamConfirm.id)}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete Team
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove Member Confirmation Dialog */}
            <AlertDialog open={!!removeMemberConfirm} onOpenChange={(open) => !open && setRemoveMemberConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove "{removeMemberConfirm?.memberName}" from this team?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => removeMemberConfirm && handleRemoveMember(removeMemberConfirm.teamId, removeMemberConfirm.memberId)}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Remove Member
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
