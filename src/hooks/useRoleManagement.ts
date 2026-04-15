import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';

// ==========================================
// USER ROLE HOOKS
// ==========================================

export interface UserRole {
    role: 'owner' | 'admin' | 'team_leader' | 'contributor' | 'none';
    isOwner: boolean;
    isAdmin: boolean;
    isTeamLeader: boolean;
}

/**
 * Hook to get the current user's role in a repository
 */
export function useUserRole(repositoryId: string | undefined, userId: string | undefined) {
    return useQuery<UserRole>({
        queryKey: ['userRole', repositoryId, userId],
        queryFn: () => api.getUserRole(repositoryId!, userId!),
        enabled: !!repositoryId && !!userId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
}

/**
 * Utility hook to check if user is owner
 */
export function useIsOwner(repositoryId: string | undefined, userId: string | undefined) {
    const { data } = useUserRole(repositoryId, userId);
    return {
        isOwner: data?.isOwner ?? false,
        isLoading: !data,
    };
}

/**
 * Utility hook to check if user is admin or owner
 */
export function useIsAdminOrOwner(repositoryId: string | undefined, userId: string | undefined) {
    const { data } = useUserRole(repositoryId, userId);
    return {
        isAdminOrOwner: (data?.isOwner ?? false) || (data?.isAdmin ?? false),
        isLoading: !data,
    };
}

/**
 * Utility hook to check if user is team leader
 */
export function useIsTeamLeader(repositoryId: string | undefined, userId: string | undefined) {
    const { data } = useUserRole(repositoryId, userId);
    return {
        isTeamLeader: data?.isTeamLeader ?? false,
        isLoading: !data,
    };
}

// ==========================================
// ADMIN MANAGEMENT HOOKS
// ==========================================

export interface Admin {
    id: string;
    userId: string;
    userName: string;
    email?: string;
    avatarUrl?: string;
    assignedByUserId?: string;
    createdAt: string;
}

/**
 * Hook to get all admins for a repository (owner only)
 */
export function useAdmins(repositoryId: string | undefined, userId: string | undefined) {
    return useQuery<Admin[]>({
        queryKey: ['admins', repositoryId],
        queryFn: () => api.getAdmins(repositoryId!, userId!),
        enabled: !!repositoryId && !!userId,
    });
}

/**
 * Hook to add an admin (owner only)
 */
export function useAddAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ repositoryId, currentUserId, adminUserId }: {
            repositoryId: string;
            currentUserId: string;
            adminUserId: string
        }) => api.addAdmin(repositoryId, currentUserId, adminUserId),
        onSuccess: (_, variables) => {
            // Invalidate admins list
            queryClient.invalidateQueries({ queryKey: ['admins', variables.repositoryId] });
            // Invalidate the new admin's role
            queryClient.invalidateQueries({ queryKey: ['userRole', variables.repositoryId, variables.adminUserId] });
        },
    });
}

/**
 * Hook to remove an admin (owner only)
 */
export function useRemoveAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ repositoryId, adminId, userId }: {
            repositoryId: string;
            adminId: string;
            userId: string
        }) => api.removeAdmin(repositoryId, adminId, userId),
        onSuccess: (_, variables) => {
            // Invalidate admins list
            queryClient.invalidateQueries({ queryKey: ['admins', variables.repositoryId] });
            // Invalidate all user roles for this repo (admin might be viewing)
            queryClient.invalidateQueries({ queryKey: ['userRole', variables.repositoryId] });
        },
    });
}
