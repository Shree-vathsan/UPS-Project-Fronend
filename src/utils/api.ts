import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

async function handleResponse(res: Response) {
    if (!res.ok) {
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            throw new Error(json.error || json.message || 'Request failed');
        } catch {
            throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
        }
    }

    const text = await res.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export const api = {
    // Auth
    async githubLogin(redirectUri: string) {
        const res = await fetch(`${API_BASE}/auth/github?redirectUri=${redirectUri}`);
        return handleResponse(res);
    },

    async githubCallback(code: string) {
        const res = await fetch(`${API_BASE}/auth/github/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        return handleResponse(res);
    },

    // Repositories
    async getRepositories(token: string, userId: string, page: number = 1, perPage: number = 100) {
        // GitHub API max per_page is 100
        const actualPerPage = Math.min(perPage, 100);
        const res = await fetch(`${API_BASE}/repositories?userId=${userId}&page=${page}&per_page=${actualPerPage}&sort=pushed`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const linkHeader = res.headers.get('Link');
        let totalPages = 0;

        if (linkHeader) {
            const match = linkHeader.match(/&page=(\d+)[^>]*>; rel="last"/);
            if (match) {
                totalPages = parseInt(match[1]);
            }
        }

        const data = await handleResponse(res);
        return { data: Array.isArray(data) ? data : [], totalPages };
    },

    // Fetch ALL repositories by paginating through all pages
    async getAllRepositories(token: string, userId: string) {
        const perPage = 100; // GitHub API max
        let allRepos: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const { data, totalPages } = await this.getRepositories(token, userId, page, perPage);

            if (data.length === 0) {
                hasMore = false;
            } else {
                allRepos = [...allRepos, ...data];
                // If we got fewer than perPage, we're on the last page
                // Or if we've reached the totalPages from the Link header
                if (data.length < perPage || (totalPages > 0 && page >= totalPages)) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        }

        return { data: allRepos, totalPages: page };
    },

    async analyzeRepository(owner: string, repo: string, userId: string, token?: string) {
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/repositories/${owner}/${repo}/analyze?userId=${userId}`, {
            method: 'POST',
            headers
        });
        return handleResponse(res);
    },

    async getRepositoryStatus(owner: string, repo: string) {
        const res = await fetch(`${API_BASE}/repositories/${owner}/${repo}/status`);
        return handleResponse(res);
    },

    async getRepository(id: string, token?: string) {
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/repositories/${id}`, { headers });
        return handleResponse(res);
    },

    // Commits
    async getCommits(repositoryId: string) {
        const res = await fetch(`${API_BASE}/commits/repository/${repositoryId}`);
        return handleResponse(res);
    },

    // Files
    async getFiles(repositoryId: string) {
        const res = await fetch(`${API_BASE}/files/repository/${repositoryId}`);
        return handleResponse(res);
    },

    async getFileBranches(fileId: string) {
        const res = await fetch(`${API_BASE}/files/${fileId}/branches`);
        return handleResponse(res);
    },

    async getPullRequests(repositoryId: string) {
        const res = await fetch(`${API_BASE}/pullrequests/repository/${repositoryId}`);
        return handleResponse(res);
    },

    async getPullRequestDetails(owner: string, repo: string, prNumber: number, token?: string) {
        const headers: any = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/pullrequests/${owner}/${repo}/${prNumber}/details`, {
            headers
        });
        return handleResponse(res);
    },

    async getFileAnalysis(fileId: string) {
        const res = await fetch(`${API_BASE}/files/${fileId}`);
        return handleResponse(res);
    },

    async getAnalyzedRepositories(userId: string, filter: 'your' | 'others' | 'all') {
        const res = await fetch(`${API_BASE}/repositories/analyzed?userId=${userId}&filter=${filter}`);
        return handleResponse(res);
    },

    async analyzeRepositoryByUrl(url: string, userId: string, token?: string) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/repositories/analyze-url`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ url, userId })
        });
        return handleResponse(res);
    },

    async deleteRepository(repositoryId: string) {
        const res = await fetch(`${API_BASE}/repositories/${repositoryId}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    // ==========================================
    // NOTES SYSTEM
    // ==========================================

    // File-Level Sticky Notes
    async getFileStickyNotes(fileId: string) {
        const res = await fetch(`${API_BASE}/api/notes/file/sticky/${fileId}`);
        return handleResponse(res);
    },

    async createFileStickyNote(userId: string, data: { repositoryId: string; fileId: string; content: string }) {
        const res = await fetch(`${API_BASE}/api/notes/file/sticky/text?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                RepositoryId: data.repositoryId,
                FileId: data.fileId,
                Content: data.content
            })
        });
        return handleResponse(res);
    },

    async uploadFileDocument(userId: string, repositoryId: string, fileId: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(
            `${API_BASE}/api/notes/file/sticky/document?userId=${userId}&repositoryId=${repositoryId}&fileId=${fileId}`,
            { method: 'POST', body: formData }
        );
        return handleResponse(res);
    },

    async updateStickyNote(noteId: string, userId: string, data: { content?: string; taggedFileIds?: string[] }) {
        const res = await fetch(`${API_BASE}/api/notes/sticky/${noteId}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Content: data.content,
                TaggedFileIds: data.taggedFileIds
            })
        });
        return handleResponse(res);
    },

    async deleteStickyNote(noteId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/notes/sticky/${noteId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    // File-Level Discussion
    async getFileDiscussion(fileId: string) {
        const res = await fetch(`${API_BASE}/api/notes/file/discussion/${fileId}`);
        return handleResponse(res);
    },

    async postFileMessage(fileId: string, userId: string, message: string) {
        const res = await fetch(`${API_BASE}/api/notes/file/discussion/${fileId}/messages?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Message: message })
        });
        return handleResponse(res);
    },

    async updateDiscussionMessage(messageId: string, userId: string, message: string) {
        const res = await fetch(`${API_BASE}/api/notes/discussion/messages/${messageId}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Message: message })
        });
        return handleResponse(res);
    },

    async deleteDiscussionMessage(messageId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/notes/discussion/messages/${messageId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    // File-Level Personal Notes
    async getFilePersonalNotes(fileId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/notes/file/personal/${fileId}?userId=${userId}`);
        return handleResponse(res);
    },

    async createFilePersonalNote(userId: string, data: { fileId: string; content: string; lineNumber?: number }) {
        const res = await fetch(`${API_BASE}/api/notes/file/personal?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                FileId: data.fileId,
                Content: data.content,
                LineNumber: data.lineNumber
            })
        });
        return handleResponse(res);
    },

    async updatePersonalNote(noteId: string, userId: string, data: { content: string; lineNumber?: number }) {
        const res = await fetch(`${API_BASE}/api/notes/personal/${noteId}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Content: data.content,
                LineNumber: data.lineNumber
            })
        });
        return handleResponse(res);
    },

    async deletePersonalNote(noteId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/notes/personal/${noteId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    // Repository-Level Sticky Notes
    async getRepoStickyNotes(repositoryId: string) {
        const res = await fetch(`${API_BASE}/api/notes/repo/sticky/${repositoryId}`);
        return handleResponse(res);
    },

    async createRepoStickyNote(userId: string, data: { repositoryId: string; content: string; taggedFileIds?: string[]; taggedBranchIds?: string[] }) {
        const res = await fetch(`${API_BASE}/api/notes/repo/sticky/text?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async uploadRepoDocument(userId: string, repositoryId: string, file: File, taggedFileIds?: string[]) {
        const formData = new FormData();
        formData.append('file', file);
        let url = `${API_BASE}/api/notes/repo/sticky/document?userId=${userId}&repositoryId=${repositoryId}`;
        if (taggedFileIds && taggedFileIds.length > 0) {
            url += `&taggedFileIds=${taggedFileIds.join(',')}`;
        }
        const res = await fetch(url, { method: 'POST', body: formData });
        return handleResponse(res);
    },

    // Repository-Level Discussion
    async getRepoDiscussion(repositoryId: string) {
        const res = await fetch(`${API_BASE}/api/notes/repo/discussion/${repositoryId}`);
        return handleResponse(res);
    },

    async postRepoMessage(repositoryId: string, userId: string, message: string, taggedFileIds?: string[], taggedBranchIds?: string[]) {
        const res = await fetch(`${API_BASE}/api/notes/repo/discussion/${repositoryId}/messages?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, taggedFileIds, taggedBranchIds })
        });
        return handleResponse(res);
    },

    // Repository-Level Personal Notes
    async getRepoPersonalNotes(repositoryId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/notes/repo/personal/${repositoryId}?userId=${userId}`);
        return handleResponse(res);
    },

    async createRepoPersonalNote(userId: string, data: { repositoryId: string; content: string; taggedFileIds?: string[]; taggedBranchIds?: string[] }) {
        const res = await fetch(`${API_BASE}/api/notes/repo/personal?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    // Users with Repo Access (for @mention autocomplete)
    async getUsersWithRepoAccess(repositoryId: string) {
        const res = await fetch(`${API_BASE}/api/notes/users/${repositoryId}`);
        return handleResponse(res);
    },

    // Notifications
    async getNotifications(userId: string, page: number = 1, pageSize: number = 20) {
        const res = await fetch(`${API_BASE}/api/notifications?userId=${userId}&page=${page}&pageSize=${pageSize}`);
        return handleResponse(res);
    },

    async getUnreadNotificationCount(userId: string) {
        const res = await fetch(`${API_BASE}/api/notifications/unread-count?userId=${userId}`);
        return handleResponse(res);
    },

    async markNotificationAsRead(notificationId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/notifications/${notificationId}/read?userId=${userId}`, {
            method: 'PUT'
        });
        return handleResponse(res);
    },

    async markAllNotificationsAsRead(userId: string) {
        const res = await fetch(`${API_BASE}/api/notifications/mark-all-read?userId=${userId}`, {
            method: 'PUT'
        });
        return handleResponse(res);
    },

    async deleteNotification(notificationId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/notifications/${notificationId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    // Line Comments
    async getLineCommentsForFile(fileId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/linecomments/file/${fileId}?userId=${userId}`);
        return handleResponse(res);
    },

    async getLineCommentsForLine(fileId: string, lineNumber: number, userId: string) {
        const res = await fetch(`${API_BASE}/api/linecomments/file/${fileId}/line/${lineNumber}?userId=${userId}`);
        return handleResponse(res);
    },

    async createLineComment(userId: string, data: { repositoryId: string; fileId: string; lineNumber: number; commentText: string; isShared: boolean }) {
        const res = await fetch(`${API_BASE}/api/linecomments?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                RepositoryId: data.repositoryId,
                FileId: data.fileId,
                LineNumber: data.lineNumber,
                CommentText: data.commentText,
                IsShared: data.isShared
            })
        });
        return handleResponse(res);
    },

    async updateLineComment(commentId: string, userId: string, commentText: string) {
        const res = await fetch(`${API_BASE}/api/linecomments/${commentId}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ CommentText: commentText })
        });
        return handleResponse(res);
    },

    async deleteLineComment(commentId: string, userId: string) {
        const res = await fetch(`${API_BASE}/api/linecomments/${commentId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    // ==========================================
    // PERSONALIZED DASHBOARD
    // ==========================================

    async getDashboardData(userId: string) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}`);
        return handleResponse(res);
    },

    async getRecentFiles(userId: string, limit: number = 10) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}/recent-files?limit=${limit}`);
        return handleResponse(res);
    },

    async trackFileView(userId: string, fileId: string) {
        const res = await fetch(`${API_BASE}/dashboard/file-view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fileId })
        });
        return handleResponse(res);
    },

    async clearRecentFiles(userId: string) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}/recent-files`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    async getBookmarks(userId: string) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}/bookmarks`);
        return handleResponse(res);
    },

    async checkBookmark(userId: string, fileId: string) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}/bookmarks/${fileId}/check`);
        return handleResponse(res);
    },

    async addBookmark(userId: string, fileId: string, category?: string) {
        const res = await fetch(`${API_BASE}/dashboard/bookmark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fileId, category })
        });
        return handleResponse(res);
    },

    async removeBookmark(userId: string, fileId: string) {
        const res = await fetch(`${API_BASE}/dashboard/bookmark?userId=${userId}&fileId=${fileId}`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    async clearBookmarks(userId: string) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}/bookmarks`, {
            method: 'DELETE'
        });
        return handleResponse(res);
    },

    async getTeamActivity(userId: string, limit: number = 20) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}/team-activity?limit=${limit}`);
        return handleResponse(res);
    },

    async getQuickStats(userId: string) {
        const res = await fetch(`${API_BASE}/dashboard/${userId}/stats`);
        return handleResponse(res);
    },

    async getPendingReviews(userId: string, limit: number = 10) {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/dashboard/${userId}/pending-reviews?limit=${limit}`, {
            headers
        });
        return handleResponse(res);
    }
};
