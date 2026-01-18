import { useState } from 'react';
import { Trash2, Plus, Shield, Search, X } from 'lucide-react';
import { useAdmins, useAddAdmin, useRemoveAdmin } from '../hooks/useRoleManagement';
import { useUsersWithRepoAccess } from '../hooks/useApiQueries';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface AdminsTabProps {
    repositoryId: string;
    userId: string;
    isOwner: boolean;
}

export function AdminsTab({ repositoryId, userId, isOwner }: AdminsTabProps) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const { data: admins, isLoading } = useAdmins(repositoryId, userId);
    const { data: usersWithAccess } = useUsersWithRepoAccess(repositoryId);
    const addAdminMutation = useAddAdmin();
    const removeAdminMutation = useRemoveAdmin();

    // Filter users who aren't already admins
    const availableUsers = usersWithAccess?.filter(
        (user: any) => !admins?.some((admin) => admin.userId === user.id) && user.id !== userId
    ) || [];

    const filteredUsers = availableUsers.filter((user: any) =>
        user.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddAdmin = async () => {
        if (!selectedUserId) {
            toast.error('Please select a user to add as admin');
            return;
        }

        try {
            await addAdminMutation.mutateAsync({
                repositoryId,
                currentUserId: userId,
                adminUserId: selectedUserId,
            });
            toast.success('Admin added successfully');
            setShowAddModal(false);
            setSelectedUserId(null);
            setSearchTerm('');
        } catch (error: any) {
            toast.error(error.message || 'Failed to add admin');
        }
    };

    const handleRemoveAdmin = async (adminId: string, adminName: string) => {
        if (!confirm(`Remove ${adminName} as admin?`)) return;

        try {
            await removeAdminMutation.mutateAsync({
                repositoryId,
                adminId,
                userId,
            });
            toast.success('Admin removed successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove admin');
        }
    };

    if (!isOwner) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Shield className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Access Denied</p>
                <p className="text-sm">Only the repository owner can manage admins</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Repository Admins</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Admins can manage teams and assign team leaders
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Admin
                </Button>
            </div>

            {/* Admins List */}
            {admins && admins.length > 0 ? (
                <div className="grid gap-4">
                    {admins.map((admin) => (
                        <div
                            key={admin.id}
                            className="flex items-center justify-between p-4 border rounded-lg bg-card"
                        >
                            <div className="flex items-center gap-4">
                                {admin.avatarUrl ? (
                                    <img
                                        src={admin.avatarUrl}
                                        alt={admin.userName}
                                        className="w-12 h-12 rounded-full"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                        {admin.userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold">{admin.userName}</h3>
                                    {admin.email && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{admin.email}</p>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAdmin(admin.id, admin.userName)}
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                disabled={removeAdminMutation.isPending}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-gray-600 dark:text-gray-400">No admins assigned yet</p>
                    <p className="text-sm text-gray-500 mt-2">Add admins to help manage this repository</p>
                </div>
            )}

            {/* Add Admin Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background border rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Add Admin</h3>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSelectedUserId(null);
                                    setSearchTerm('');
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* User List */}
                        <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user: any) => (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition ${selectedUserId === user.id
                                            ? 'bg-primary/20 border border-primary'
                                            : 'bg-muted'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.authorName}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                                                    {user.authorName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium">{user.authorName}</p>
                                                {user.email && <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    {searchTerm ? 'No users found' : 'No users available to add as admin'}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSelectedUserId(null);
                                    setSearchTerm('');
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddAdmin}
                                disabled={!selectedUserId || addAdminMutation.isPending}
                                className="flex-1"
                            >
                                {addAdminMutation.isPending ? 'Adding...' : 'Add Admin'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
