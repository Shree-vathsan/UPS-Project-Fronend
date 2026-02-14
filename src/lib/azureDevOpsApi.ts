import { API_BASE_URL } from '../config';
import { AzureDevOpsProject, AzureDevOpsTeam, AzureDevOpsWorkItem } from './azureDevOpsTypes';

// Azure DevOps API Client

export const azureDevOpsApi = {
    // Get all projects
    async getProjects(): Promise<AzureDevOpsProject[]> {
        const response = await fetch(`${API_BASE_URL}/azuredevops/projects`);
        if (!response.ok) {
            throw new Error('Failed to fetch Azure DevOps projects');
        }
        return response.json();
    },

    // Get teams for a project
    async getTeams(projectId: string): Promise<AzureDevOpsTeam[]> {
        const response = await fetch(`${API_BASE_URL}/azuredevops/projects/${encodeURIComponent(projectId)}/teams`);
        if (!response.ok) {
            throw new Error(`Failed to fetch teams for project ${projectId}`);
        }
        return response.json();
    },

    // Get work items for a project
    async getWorkItems(projectId: string, teamId?: string, state?: string): Promise<AzureDevOpsWorkItem[]> {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);
        if (state) params.append('state', state);

        const url = `${API_BASE_URL}/azuredevops/projects/${encodeURIComponent(projectId)}/workitems${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch work items for project ${projectId}`);
        }
        return response.json();
    },

    // Get work item details
    async getWorkItemDetails(workItemId: number): Promise<AzureDevOpsWorkItem> {
        const response = await fetch(`${API_BASE_URL}/azuredevops/workitems/${workItemId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch work item ${workItemId}`);
        }
        return response.json();
    },
};
