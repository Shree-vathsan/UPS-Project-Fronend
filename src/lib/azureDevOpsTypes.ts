// Azure DevOps TypeScript Types

export interface AzureDevOpsProject {
    id: string;
    name: string;
    description: string;
    url: string;
    state: string;
    revision: number;
    visibility: string;
    lastUpdateTime: string;
}

export interface AzureDevOpsTeam {
    id: string;
    name: string;
    description: string;
    url: string;
    projectName: string;
    projectId: string;
}

export interface AzureDevOpsWorkItem {
    // Basic Info
    id: number;
    rev: number;
    title: string;
    workItemType: string;
    state: string;

    // Assignment
    assignedTo?: string;
    assignedToDisplayName?: string;
    assignedToAvatarUrl?: string;

    // Dates & Timeline
    createdDate: string;
    changedDate: string;
    closedDate?: string;
    resolvedDate?: string;
    stateChangeDate?: string;
    activatedDate?: string;
    dueDate?: string;
    startDate?: string;
    finishDate?: string;

    // People
    createdBy?: string;
    changedBy?: string;
    resolvedBy?: string;
    closedBy?: string;
    activatedBy?: string;

    // Organization
    areaPath?: string;
    iterationPath?: string;
    teamProject?: string;

    // Priority & Severity
    priority?: number;
    severity?: string;
    risk?: string;

    // Effort & Planning
    storyPoints?: number;
    effort?: number;
    originalEstimate?: number;
    remainingWork?: number;
    completedWork?: number;
    businessValue?: number;
    timeCriticality?: number;

    // Process Fields
    reason?: string;
    activity?: string;
    valueArea?: string;

    // Content
    description?: string;
    acceptanceCriteria?: string;
    reproSteps?: string;
    systemInfo?: string;

    // Metadata
    tags: string[];
    commentCount: number;
    relationCount: number;

    // Relationships
    parentWorkItemId?: string;
    parentWorkItemTitle?: string;
    childWorkItemsCount: number;
    relatedWorkItemsCount: number;
    linkedPullRequestsCount: number;

    // URLs
    url: string;
    webUrl?: string;
}

// Developer Inactivity Detection Types

export interface DeveloperActivityProfile {
    developerName: string;
    avatarUrl?: string;
    inactivityScore: number;           // 0-100
    inactivityLevel: string;           // Active, Low Risk, Moderate, At Risk, Inactive
    assignedItems: AzureDevOpsWorkItem[];
    totalStoryPoints: number;
    estimatedWorkDaysRemaining: number;
    lastWorkItemUpdate?: string;
    activeItemCount: number;
    totalItemCount: number;
    reasoning: string;
}

export interface DeveloperInactivityReport {
    projectId: string;
    projectName: string;
    generatedAt: string;
    totalDevelopers: number;
    activeCount: number;
    atRiskCount: number;
    inactiveCount: number;
    developers: DeveloperActivityProfile[];
}
