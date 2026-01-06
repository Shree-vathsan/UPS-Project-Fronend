import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';

// Query Keys - centralized for cache invalidation
export const queryKeys = {
    repositories: (userId: string) => ['repositories', userId] as const,
    allRepositories: (userId: string, token: string) => ['allRepositories', userId, token] as const,
    analyzedRepositories: (userId: string, filter: 'your' | 'others' | 'all') => ['analyzedRepositories', userId, filter] as const,
    repository: (id: string) => ['repository', id] as const,
    repositoryStatus: (owner: string, repo: string) => ['repositoryStatus', owner, repo] as const,
    commits: (repositoryId: string) => ['commits', repositoryId] as const,
    branchCommits: (repositoryId: string, branch: string) => ['branchCommits', repositoryId, branch] as const,
    pullRequests: (repositoryId: string) => ['pullRequests', repositoryId] as const,
    pullRequestDetails: (owner: string, repo: string, prNumber: number) => ['pullRequestDetails', owner, repo, prNumber] as const,
    files: (repositoryId: string) => ['files', repositoryId] as const,
    branchFiles: (repositoryId: string, branch: string) => ['branchFiles', repositoryId, branch] as const,
    fileAnalysis: (fileId: string) => ['fileAnalysis', fileId] as const,
    file: (fileId: string) => ['file', fileId] as const,
    fileContent: (fileId: string, commitSha?: string, branch?: string) => ['fileContent', fileId, commitSha, branch] as const,
    fileCommits: (fileId: string) => ['fileCommits', fileId] as const,
    fileEnhancedAnalysis: (fileId: string) => ['fileEnhancedAnalysis', fileId] as const,
    fileSummary: (fileId: string) => ['fileSummary', fileId] as const,
    branches: (repositoryId: string) => ['branches', repositoryId] as const,
    commit: (commitId: string) => ['commit', commitId] as const,
    commitGithubDetails: (commitId: string) => ['commitGithubDetails', commitId] as const,
    repositoryAnalytics: (repositoryId: string, branch: string) => ['repositoryAnalytics', repositoryId, branch] as const,
    repositorySummary: (repositoryId: string, branch: string) => ['repositorySummary', repositoryId, branch] as const,
    teamInsights: (repositoryId: string, branch: string) => ['teamInsights', repositoryId, branch] as const,
    // Notes System
    fileStickyNotes: (fileId: string) => ['fileStickyNotes', fileId] as const,
    fileDiscussion: (fileId: string) => ['fileDiscussion', fileId] as const,
    filePersonalNotes: (fileId: string, userId: string) => ['filePersonalNotes', fileId, userId] as const,
    repoStickyNotes: (repositoryId: string) => ['repoStickyNotes', repositoryId] as const,
    repoDiscussion: (repositoryId: string) => ['repoDiscussion', repositoryId] as const,
    repoPersonalNotes: (repositoryId: string, userId: string) => ['repoPersonalNotes', repositoryId, userId] as const,
    usersWithRepoAccess: (repositoryId: string) => ['usersWithRepoAccess', repositoryId] as const,
    notifications: (userId: string, page: number) => ['notifications', userId, page] as const,
    unreadNotificationCount: (userId: string) => ['unreadNotificationCount', userId] as const,
    // Personalized Dashboard
    dashboardData: (userId: string) => ['dashboardData', userId] as const,
    recentFiles: (userId: string) => ['recentFiles', userId] as const,
    bookmarks: (userId: string) => ['bookmarks', userId] as const,
    isBookmarked: (userId: string, fileId: string) => ['isBookmarked', userId, fileId] as const,
    teamActivity: (userId: string) => ['teamActivity', userId] as const,
    quickStats: (userId: string) => ['quickStats', userId] as const,
    pendingReviews: (userId: string) => ['pendingReviews', userId] as const,
};

import { API_BASE_URL } from '../config';

// API base URL
const API_BASE = API_BASE_URL;

// ==================== Repository Hooks ====================

export function useAllRepositories(token: string, userId: string) {
    return useQuery({
        queryKey: queryKeys.allRepositories(userId, token),
        queryFn: () => api.getAllRepositories(token, userId),
        enabled: !!token && !!userId,
    });
}

export function useAnalyzedRepositories(userId: string, filter: 'your' | 'others' | 'all') {
    return useQuery({
        queryKey: queryKeys.analyzedRepositories(userId, filter),
        queryFn: () => api.getAnalyzedRepositories(userId, filter),
        enabled: !!userId,
    });
}

export function useRepository(repositoryId: string | undefined, token?: string) {
    return useQuery({
        queryKey: queryKeys.repository(repositoryId || ''),
        queryFn: () => api.getRepository(repositoryId!, token),
        enabled: !!repositoryId,
    });
}

export function useRepositoryStatus(owner: string, repo: string) {
    return useQuery({
        queryKey: queryKeys.repositoryStatus(owner, repo),
        queryFn: () => api.getRepositoryStatus(owner, repo),
        enabled: !!owner && !!repo,
    });
}

// ==================== Branch Hooks ====================

export function useBranches(repositoryId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.branches(repositoryId || ''),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/branches`);
            if (!res.ok) throw new Error('Failed to fetch branches');
            return res.json();
        },
        enabled: !!repositoryId,
    });
}

// ==================== Commit Hooks ====================

export function useCommits(repositoryId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.commits(repositoryId || ''),
        queryFn: () => api.getCommits(repositoryId!),
        enabled: !!repositoryId,
    });
}

export function useBranchCommits(repositoryId: string | undefined, branch: string) {
    return useQuery({
        queryKey: queryKeys.branchCommits(repositoryId || '', branch),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/branches/${branch}/commits`);
            if (!res.ok) throw new Error('Failed to fetch commits');
            return res.json();
        },
        enabled: !!repositoryId && !!branch,
    });
}

export function useCommit(commitId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.commit(commitId || ''),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/commits/${commitId}`);
            if (!res.ok) throw new Error('Commit not found');
            return res.json();
        },
        enabled: !!commitId,
    });
}

export function useCommitGithubDetails(commitId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.commitGithubDetails(commitId || ''),
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_BASE}/commits/${commitId}/github-details`, { headers });
            if (!res.ok) throw new Error('Failed to fetch GitHub details');
            return res.json();
        },
        enabled: !!commitId,
    });
}

// ==================== Pull Request Hooks ====================

export function usePullRequests(repositoryId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.pullRequests(repositoryId || ''),
        queryFn: () => api.getPullRequests(repositoryId!),
        enabled: !!repositoryId,
    });
}

export function usePullRequestDetails(owner: string | undefined, repo: string | undefined, prNumber: number | undefined, token?: string) {
    return useQuery({
        queryKey: queryKeys.pullRequestDetails(owner || '', repo || '', prNumber || 0),
        queryFn: () => api.getPullRequestDetails(owner!, repo!, prNumber!, token),
        enabled: !!owner && !!repo && !!prNumber,
    });
}

// ==================== File Hooks ====================

export function useFiles(repositoryId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.files(repositoryId || ''),
        queryFn: () => api.getFiles(repositoryId!),
        enabled: !!repositoryId,
    });
}

export function useFileBranches(fileId: string | undefined) {
    return useQuery({
        queryKey: ['fileBranches', fileId],
        queryFn: () => api.getFileBranches(fileId!),
        enabled: !!fileId,
    });
}

export function useBranchFiles(repositoryId: string | undefined, branch: string) {
    return useQuery({
        queryKey: queryKeys.branchFiles(repositoryId || '', branch),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/branches/${branch}/files`);
            if (!res.ok) throw new Error('Failed to fetch files');
            return res.json();
        },
        enabled: !!repositoryId && !!branch,
    });
}

export function useFile(fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.file(fileId || ''),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/files/${fileId}`);
            if (!res.ok) throw new Error('File not found');
            return res.json();
        },
        enabled: !!fileId,
    });
}

export function useFileAnalysis(fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.fileAnalysis(fileId || ''),
        queryFn: () => api.getFileAnalysis(fileId!),
        enabled: !!fileId,
    });
}

export function useFileContent(fileId: string | undefined, commitSha?: string, branch?: string) {
    return useQuery({
        queryKey: queryKeys.fileContent(fileId || '', commitSha, branch),
        queryFn: async () => {
            const token = localStorage.getItem('token');
            let contentUrl = `${API_BASE}/files/${fileId}/content`;
            const params = new URLSearchParams();

            if (commitSha) {
                params.append('commitSha', commitSha);
            } else if (branch) {
                params.append('branchName', branch);
            }

            if (params.toString()) {
                contentUrl += `?${params.toString()}`;
            }

            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(contentUrl, { headers });
            if (!res.ok) throw new Error('Failed to fetch file content');
            return res.json();
        },
        enabled: !!fileId,
    });
}

export function useFileCommits(fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.fileCommits(fileId || ''),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/files/${fileId}/commits`);
            if (!res.ok) throw new Error('Failed to fetch file commits');
            return res.json();
        },
        enabled: !!fileId,
    });
}

// ==================== Analytics Hooks ====================

export function useRepositoryAnalytics(repositoryId: string | undefined, branchName: string) {
    return useQuery({
        queryKey: queryKeys.repositoryAnalytics(repositoryId || '', branchName),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/repositories/${repositoryId}/analytics?branchName=${encodeURIComponent(branchName)}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        },
        enabled: !!repositoryId && !!branchName,
        staleTime: 10 * 60 * 1000, // Analytics can be stale for longer
    });
}

export function useRepositorySummary(repositoryId: string | undefined, branchName: string) {
    return useQuery({
        queryKey: queryKeys.repositorySummary(repositoryId || '', branchName),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/repositories/${repositoryId}/summary?branchName=${encodeURIComponent(branchName)}`);
            if (!res.ok) throw new Error('Failed to fetch summary');
            return res.json();
        },
        enabled: !!repositoryId && !!branchName,
        staleTime: 10 * 60 * 1000,
    });
}

export function useTeamInsights(repositoryId: string | undefined, branchName: string) {
    return useQuery({
        queryKey: queryKeys.teamInsights(repositoryId || '', branchName),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/repositories/${repositoryId}/team-insights?branchName=${encodeURIComponent(branchName)}`);
            if (!res.ok) throw new Error('Failed to fetch team insights');
            return res.json();
        },
        enabled: !!repositoryId && !!branchName,
        staleTime: 10 * 60 * 1000,
    });
}

// ==================== File Analysis Hooks ====================

export function useFileEnhancedAnalysis(fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.fileEnhancedAnalysis(fileId || ''),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/repositories/files/${fileId}/enhanced-analysis`);
            if (!res.ok) throw new Error('Failed to fetch enhanced analysis');
            return res.json();
        },
        enabled: !!fileId,
        staleTime: 10 * 60 * 1000,
    });
}

export function useFileSummary(fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.fileSummary(fileId || ''),
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/files/${fileId}/summary`);
            if (!res.ok) throw new Error('Failed to fetch file summary');
            return res.json();
        },
        enabled: !!fileId,
        staleTime: 10 * 60 * 1000,
    });
}

// ==================== Mutation Hooks ====================

export function useAnalyzeRepository() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ owner, repo, userId, token }: { owner: string; repo: string; userId: string; token?: string }) =>
            api.analyzeRepository(owner, repo, userId, token),
        onSuccess: (_, { owner, repo, userId }) => {
            // Invalidate related queries after analysis starts
            queryClient.invalidateQueries({ queryKey: ['repositoryStatus', owner, repo] });
            queryClient.invalidateQueries({ queryKey: ['analyzedRepositories', userId] });
        },
    });
}

export function useAnalyzeRepositoryByUrl() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ url, userId, token }: { url: string; userId: string; token?: string }) =>
            api.analyzeRepositoryByUrl(url, userId, token),
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['analyzedRepositories', userId] });
        },
    });
}

// ==================== Cache Invalidation Helpers ====================

export function useInvalidateRepositories() {
    const queryClient = useQueryClient();

    return {
        invalidateAll: (userId: string) => {
            queryClient.invalidateQueries({ queryKey: ['repositories', userId] });
            queryClient.invalidateQueries({ queryKey: ['allRepositories', userId] });
            queryClient.invalidateQueries({ queryKey: ['analyzedRepositories', userId] });
        },
        invalidateRepository: (repositoryId: string) => {
            queryClient.invalidateQueries({ queryKey: ['repository', repositoryId] });
            queryClient.invalidateQueries({ queryKey: ['commits', repositoryId] });
            queryClient.invalidateQueries({ queryKey: ['pullRequests', repositoryId] });
            queryClient.invalidateQueries({ queryKey: ['files', repositoryId] });
            queryClient.invalidateQueries({ queryKey: ['branches', repositoryId] });
        },
        // Notes System Invalidations
        invalidateFileStickyNotes: (fileId: string) => {
            queryClient.invalidateQueries({ queryKey: ['fileStickyNotes', fileId] });
        },
        invalidateFileDiscussion: (fileId: string) => {
            queryClient.invalidateQueries({ queryKey: ['fileDiscussion', fileId] });
        },
        invalidateFilePersonalNotes: (fileId: string, userId: string) => {
            queryClient.invalidateQueries({ queryKey: ['filePersonalNotes', fileId, userId] });
        },
        invalidateRepoNotes: (repositoryId: string) => {
            queryClient.invalidateQueries({ queryKey: ['repoStickyNotes', repositoryId] });
            queryClient.invalidateQueries({ queryKey: ['repoDiscussion', repositoryId] });
        },
        invalidateNotifications: (userId: string) => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount', userId] });
        },
    };
}

// ==================== Notes System Hooks ====================

// File-Level Sticky Notes
export function useFileStickyNotes(fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.fileStickyNotes(fileId || ''),
        queryFn: () => api.getFileStickyNotes(fileId!),
        enabled: !!fileId,
    });
}

export function useCreateFileStickyNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: { repositoryId: string; fileId: string; content: string } }) =>
            api.createFileStickyNote(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileStickyNotes', variables.data.fileId] });
        },
    });
}

export function useUploadFileDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, repositoryId, fileId, file }: { userId: string; repositoryId: string; fileId: string; file: File }) =>
            api.uploadFileDocument(userId, repositoryId, fileId, file),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileStickyNotes', variables.fileId] });
        },
    });
}

export function useUpdateStickyNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ noteId, userId, data }: { noteId: string; userId: string; data: { content?: string }; fileId?: string }) =>
            api.updateStickyNote(noteId, userId, data),
        onSuccess: (_, variables) => {
            if (variables.fileId) {
                queryClient.invalidateQueries({ queryKey: ['fileStickyNotes', variables.fileId] });
            }
        },
    });
}

export function useDeleteStickyNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ noteId, userId }: { noteId: string; userId: string; fileId?: string }) =>
            api.deleteStickyNote(noteId, userId),
        onSuccess: (_, variables) => {
            if (variables.fileId) {
                queryClient.invalidateQueries({ queryKey: ['fileStickyNotes', variables.fileId] });
            }
        },
    });
}

// File-Level Discussion
export function useFileDiscussion(fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.fileDiscussion(fileId || ''),
        queryFn: () => api.getFileDiscussion(fileId!),
        enabled: !!fileId,
    });
}

export function usePostFileMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ fileId, userId, message }: { fileId: string; userId: string; message: string }) =>
            api.postFileMessage(fileId, userId, message),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileDiscussion', variables.fileId] });
        },
    });
}

export function useUpdateDiscussionMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId, userId, message }: { messageId: string; userId: string; message: string; fileId?: string }) =>
            api.updateDiscussionMessage(messageId, userId, message),
        onSuccess: (_, variables) => {
            if (variables.fileId) {
                queryClient.invalidateQueries({ queryKey: ['fileDiscussion', variables.fileId] });
            }
        },
    });
}

export function useDeleteDiscussionMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId, userId }: { messageId: string; userId: string; fileId?: string }) =>
            api.deleteDiscussionMessage(messageId, userId),
        onSuccess: (_, variables) => {
            if (variables.fileId) {
                queryClient.invalidateQueries({ queryKey: ['fileDiscussion', variables.fileId] });
            }
        },
    });
}

// File-Level Personal Notes
export function useFilePersonalNotes(fileId: string | undefined, userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.filePersonalNotes(fileId || '', userId || ''),
        queryFn: () => api.getFilePersonalNotes(fileId!, userId!),
        enabled: !!fileId && !!userId,
    });
}

export function useCreateFilePersonalNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: { fileId: string; content: string; lineNumber?: number } }) =>
            api.createFilePersonalNote(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['filePersonalNotes', variables.data.fileId, variables.userId] });
        },
    });
}

export function useUpdatePersonalNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ noteId, userId, data }: { noteId: string; userId: string; data: { content: string; lineNumber?: number }; fileId?: string }) =>
            api.updatePersonalNote(noteId, userId, data),
        onSuccess: (_, variables) => {
            if (variables.fileId) {
                queryClient.invalidateQueries({ queryKey: ['filePersonalNotes', variables.fileId, variables.userId] });
            }
        },
    });
}

export function useDeletePersonalNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ noteId, userId }: { noteId: string; userId: string; fileId?: string }) =>
            api.deletePersonalNote(noteId, userId),
        onSuccess: (_, variables) => {
            if (variables.fileId) {
                queryClient.invalidateQueries({ queryKey: ['filePersonalNotes', variables.fileId, variables.userId] });
            }
        },
    });
}

// Repository-Level Sticky Notes
export function useRepoStickyNotes(repositoryId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.repoStickyNotes(repositoryId || ''),
        queryFn: () => api.getRepoStickyNotes(repositoryId!),
        enabled: !!repositoryId,
    });
}

export function useCreateRepoStickyNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: { repositoryId: string; content: string; taggedFileIds?: string[]; taggedBranchIds?: string[] } }) =>
            api.createRepoStickyNote(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repoStickyNotes', variables.data.repositoryId] });
        },
    });
}

export function useUploadRepoDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, repositoryId, file, taggedFileIds }: { userId: string; repositoryId: string; file: File; taggedFileIds?: string[] }) =>
            api.uploadRepoDocument(userId, repositoryId, file, taggedFileIds),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repoStickyNotes', variables.repositoryId] });
        },
    });
}


// Repository-Level Discussion
export function useRepoDiscussion(repositoryId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.repoDiscussion(repositoryId || ''),
        queryFn: () => api.getRepoDiscussion(repositoryId!),
        enabled: !!repositoryId,
    });
}

export function usePostRepoMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ repositoryId, userId, message, taggedFileIds, taggedBranchIds }: { repositoryId: string; userId: string; message: string; taggedFileIds?: string[]; taggedBranchIds?: string[] }) =>
            api.postRepoMessage(repositoryId, userId, message, taggedFileIds, taggedBranchIds),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repoDiscussion', variables.repositoryId] });
        },
    });
}

// Repository-Level Personal Notes
export function useRepoPersonalNotes(repositoryId: string | undefined, userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.repoPersonalNotes(repositoryId || '', userId || ''),
        queryFn: () => api.getRepoPersonalNotes(repositoryId!, userId!),
        enabled: !!repositoryId && !!userId,
    });
}

export function useCreateRepoPersonalNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: { repositoryId: string; content: string; taggedFileIds?: string[]; taggedBranchIds?: string[] } }) =>
            api.createRepoPersonalNote(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repoPersonalNotes', variables.data.repositoryId, variables.userId] });
        },
    });
}

// Users with Repo Access (for @mention autocomplete)
export function useUsersWithRepoAccess(repositoryId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.usersWithRepoAccess(repositoryId || ''),
        queryFn: () => api.getUsersWithRepoAccess(repositoryId!),
        enabled: !!repositoryId,
    });
}

// ==================== Notification Hooks ====================

export function useNotifications(userId: string | undefined, page: number = 1) {
    return useQuery({
        queryKey: queryKeys.notifications(userId || '', page),
        queryFn: () => api.getNotifications(userId!, page),
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

export function useUnreadNotificationCount(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.unreadNotificationCount(userId || ''),
        queryFn: () => api.getUnreadNotificationCount(userId!),
        enabled: !!userId,
        refetchInterval: 5 * 60 * 1000, // Poll every 5 minutes
    });
}

export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ notificationId, userId }: { notificationId: string; userId: string }) =>
            api.markNotificationAsRead(notificationId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount', variables.userId] });
        },
    });
}

export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId }: { userId: string }) => api.markAllNotificationsAsRead(userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount', variables.userId] });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ notificationId, userId }: { notificationId: string; userId: string }) =>
            api.deleteNotification(notificationId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount', variables.userId] });
        },
    });
}

// ============================================
// LINE COMMENTS HOOKS
// ============================================

export function useLineCommentsForFile(fileId: string | undefined, userId: string | undefined) {
    return useQuery({
        queryKey: ['lineComments', fileId, userId],
        queryFn: () => api.getLineCommentsForFile(fileId!, userId!),
        enabled: !!fileId && !!userId,
    });
}

export function useCreateLineComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: {
            userId: string;
            data: { repositoryId: string; fileId: string; lineNumber: number; commentText: string; isShared: boolean }
        }) => api.createLineComment(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineComments'] });
        },
    });
}

export function useUpdateLineComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ commentId, userId, commentText }: { commentId: string; userId: string; commentText: string }) =>
            api.updateLineComment(commentId, userId, commentText),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineComments'] });
        },
    });
}

export function useDeleteLineComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ commentId, userId }: { commentId: string; userId: string }) =>
            api.deleteLineComment(commentId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineComments'] });
        },
    });
}

// ==================== Personalized Dashboard Hooks ====================

export function useDashboardData(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.dashboardData(userId || ''),
        queryFn: () => api.getDashboardData(userId!),
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

export function useRecentFiles(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.recentFiles(userId || ''),
        queryFn: () => api.getRecentFiles(userId!),
        enabled: !!userId,
        staleTime: 30 * 1000,
    });
}

export function useClearRecentFiles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId }: { userId: string }) =>
            api.clearRecentFiles(userId),
        onSuccess: (_, { userId }) => {
            // Immediately set the data to empty array for instant UI update
            queryClient.setQueryData(queryKeys.recentFiles(userId), []);
            // Also invalidate to ensure fresh data on next fetch
            queryClient.invalidateQueries({ queryKey: queryKeys.recentFiles(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData(userId) });
        },
    });
}

export function useBookmarks(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.bookmarks(userId || ''),
        queryFn: () => api.getBookmarks(userId!),
        enabled: !!userId,
    });
}

export function useIsBookmarked(userId: string | undefined, fileId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.isBookmarked(userId || '', fileId || ''),
        queryFn: () => api.checkBookmark(userId!, fileId!),
        enabled: !!userId && !!fileId,
    });
}

export function useTeamActivity(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.teamActivity(userId || ''),
        queryFn: () => api.getTeamActivity(userId!),
        enabled: !!userId,
        staleTime: 60 * 1000, // 1 minute
    });
}

export function useQuickStats(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.quickStats(userId || ''),
        queryFn: () => api.getQuickStats(userId!),
        enabled: !!userId,
        staleTime: 60 * 1000,
    });
}

export function useTrackFileView() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, fileId }: { userId: string; fileId: string }) =>
            api.trackFileView(userId, fileId),
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.recentFiles(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData(userId) });
        },
    });
}

export function useAddBookmark() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, fileId, category }: { userId: string; fileId: string; category?: string }) =>
            api.addBookmark(userId, fileId, category),
        onSuccess: (_, { userId, fileId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.isBookmarked(userId, fileId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData(userId) });
        },
    });
}

export function useRemoveBookmark() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, fileId }: { userId: string; fileId: string }) =>
            api.removeBookmark(userId, fileId),
        onSuccess: (_, { userId, fileId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.isBookmarked(userId, fileId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData(userId) });
        },
    });
}

export function useClearBookmarks() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId }: { userId: string }) =>
            api.clearBookmarks(userId),
        onSuccess: (_, { userId }) => {
            // Immediately set the data to empty array for instant UI update
            queryClient.setQueryData(queryKeys.bookmarks(userId), []);
            // Also invalidate to ensure fresh data on next fetch
            queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData(userId) });
        },
    });
}

export function usePendingReviews(userId: string | undefined, limit: number = 10) {
    return useQuery({
        queryKey: queryKeys.pendingReviews(userId || ''),
        queryFn: async () => {
            console.log('[PendingReviews] Fetching for userId:', userId);
            const result = await api.getPendingReviews(userId!, limit);
            console.log('[PendingReviews] API Response:', result);
            return result;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 3, // 3 minutes
    });
}
