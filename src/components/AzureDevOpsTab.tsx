import { useState, useEffect } from 'react';
import { Calendar, User, Tag, AlertCircle, CheckCircle2, Circle, Clock, Briefcase, GitBranch, FolderTree, Ban, ChevronDown, ChevronUp, ExternalLink, GitPullRequest, Link2, FileText, TrendingUp, Target, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { azureDevOpsApi } from '../lib/azureDevOpsApi';
import { AzureDevOpsProject, AzureDevOpsWorkItem } from '../lib/azureDevOpsTypes';
import DeveloperInactivityPanel from './DeveloperInactivityPanel';

interface AzureDevOpsTabProps {
    // Props interface for future extensions
}

export function AzureDevOpsTab({ }: AzureDevOpsTabProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<AzureDevOpsProject[]>([]);
    const [selectedProject, setSelectedProject] = useState<AzureDevOpsProject | null>(null);
    const [workItems, setWorkItems] = useState<AzureDevOpsWorkItem[]>([]);
    const [loadingWorkItems, setLoadingWorkItems] = useState(false);
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    // Load projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await azureDevOpsApi.getProjects();
            setProjects(data);

            // Auto-select first project
            if (data.length > 0) {
                selectProject(data[0]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load Azure DevOps projects');
        } finally {
            setLoading(false);
        }
    };

    const selectProject = async (project: AzureDevOpsProject) => {
        setSelectedProject(project);
        setLoadingWorkItems(true);
        setError(null);

        try {
            const items = await azureDevOpsApi.getWorkItems(project.id);
            setWorkItems(items);
        } catch (err: any) {
            setError(err.message || 'Failed to load work items');
        } finally {
            setLoadingWorkItems(false);
        }
    };

    const toggleExpanded = (itemId: number) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
        }
        setExpandedItems(newExpanded);
    };

    const formatDate = (date?: string) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateTime = (date?: string) => {
        if (!date) return null;
        return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    const getStateIcon = (state: string) => {
        const lowerState = state.toLowerCase();
        if (lowerState.includes('closed') || lowerState.includes('done') || lowerState.includes('resolved') || lowerState.includes('completed')) {
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        }
        if (lowerState.includes('active') || lowerState.includes('in progress') || lowerState.includes('committed')) {
            return <Clock className="h-4 w-4 text-blue-500" />;
        }
        if (lowerState.includes('removed') || lowerState.includes('cut')) {
            return <Ban className="h-4 w-4 text-gray-500" />;
        }
        return <Circle className="h-4 w-4 text-yellow-500" />;
    };

    const getStateBadgeVariant = (state: string): "default" | "secondary" | "destructive" | "outline" | "success" => {
        const lowerState = state.toLowerCase();
        if (lowerState.includes('closed') || lowerState.includes('done') || lowerState.includes('resolved') || lowerState.includes('completed')) {
            return 'success';
        }
        if (lowerState.includes('active') || lowerState.includes('in progress') || lowerState.includes('committed')) {
            return 'default';
        }
        if (lowerState.includes('removed') || lowerState.includes('cut')) {
            return 'outline';
        }
        return 'secondary';
    };

    const getWorkItemTypeIcon = (type: string) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('bug') || lowerType.includes('issue')) {
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        }
        if (lowerType.includes('task')) {
            return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
        }
        if (lowerType.includes('epic')) {
            return <Briefcase className="h-4 w-4 text-purple-500" />;
        }
        return <Briefcase className="h-4 w-4 text-purple-500" />;
    };

    const getPriorityBadge = (priority: number) => {
        if (priority === 1) return <Badge variant="destructive" className="text-xs">P1 - Critical</Badge>;
        if (priority === 2) return <Badge variant="destructive" className="text-xs opacity-80">P2 - High</Badge>;
        if (priority === 3) return <Badge variant="default" className="text-xs">P3 - Medium</Badge>;
        if (priority === 4) return <Badge variant="secondary" className="text-xs">P4 - Low</Badge>;
        return <Badge variant="outline" className="text-xs">P{priority}</Badge>;
    };

    const getIterationName = (iterationPath: string | null | undefined) => {
        if (!iterationPath) return null;
        const parts = iterationPath.split('\\\\');
        return parts[parts.length - 1];
    };

    const getAreaName = (areaPath: string | null | undefined) => {
        if (!areaPath) return null;
        const parts = areaPath.split('\\\\');
        return parts[parts.length - 1];
    };

    const filteredWorkItems = stateFilter === 'all'
        ? workItems
        : workItems.filter(item => item.state.toLowerCase() === stateFilter.toLowerCase());

    const uniqueStates = Array.from(new Set(workItems.map(item => item.state)));

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error && projects.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                    <h3 className="font-heading text-lg font-semibold mb-2">Error Loading Azure DevOps</h3>
                    <p className="text-muted-foreground text-sm">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (projects.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-heading text-lg font-semibold mb-2">No Azure DevOps Projects</h3>
                    <p className="text-muted-foreground text-sm">
                        No projects found in your Azure DevOps organization.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Project Selector */}
            {projects.length > 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Project</CardTitle>
                        <CardDescription>Choose an Azure DevOps project to view work items</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {projects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => selectProject(project)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedProject?.id === project.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted hover:bg-muted/80'
                                        }`}
                                >
                                    {project.name}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Work Items Section */}
            {selectedProject && (
                <>
                    {/* Developer Inactivity Monitor */}
                    <DeveloperInactivityPanel projectId={selectedProject.id} />

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-heading text-2xl font-semibold">
                                {selectedProject.name} Work Items
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {workItems.length} total work item{workItems.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* State Filter */}
                        {uniqueStates.length > 1 && (
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setStateFilter('all')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${stateFilter === 'all'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted hover:bg-muted/80'
                                        }`}
                                >
                                    All ({workItems.length})
                                </button>
                                {uniqueStates.map(state => {
                                    const count = workItems.filter(i => i.state === state).length;
                                    return (
                                        <button
                                            key={state}
                                            onClick={() => setStateFilter(state)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${stateFilter === state
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80'
                                                }`}
                                        >
                                            {state} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Loading State */}
                    {loadingWorkItems && (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    )}

                    {/* Empty State */}
                    {!loadingWorkItems && filteredWorkItems.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Circle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <h3 className="font-heading text-lg font-semibold mb-2">No Work Items Found</h3>
                                <p className="text-muted-foreground text-sm">
                                    {stateFilter === 'all'
                                        ? 'No work items found in this project.'
                                        : `No work items with state "${stateFilter}".`}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Work Items List */}
                    {!loadingWorkItems && filteredWorkItems.length > 0 && (
                        <div className="grid gap-4">
                            {filteredWorkItems.map(item => {
                                const iterationName = getIterationName(item.iterationPath);
                                const areaName = getAreaName(item.areaPath);
                                const isExpanded = expandedItems.has(item.id);

                                return (
                                    <Card key={item.id} className="hover-lift">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-3">
                                                    {/* Work Item Type, ID and Expand Button */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {getWorkItemTypeIcon(item.workItemType)}
                                                        <Badge variant="outline" className="text-xs font-mono">
                                                            {item.workItemType}
                                                        </Badge>
                                                        <code className="text-xs text-muted-foreground font-mono">
                                                            #{item.id}
                                                        </code>
                                                        {item.webUrl && (
                                                            <a
                                                                href={item.webUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                                Open in ADO
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => toggleExpanded(item.id)}
                                                            className="ml-auto px-2 py-1 text-xs rounded hover:bg-muted transition-colors flex items-center gap-1"
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    <ChevronUp className="h-3 w-3" />
                                                                    Less
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="h-3 w-3" />
                                                                    More Details
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Title */}
                                                    <CardTitle className="text-base leading-tight">
                                                        {item.title}
                                                    </CardTitle>

                                                    {/* Primary Metadata Row */}
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                                        {/* State */}
                                                        <div className="flex items-center gap-1.5">
                                                            {getStateIcon(item.state)}
                                                            <Badge variant={getStateBadgeVariant(item.state)} className="text-xs">
                                                                {item.state}
                                                            </Badge>
                                                        </div>

                                                        {/* Priority */}
                                                        {item.priority && getPriorityBadge(item.priority)}

                                                        {/* Severity */}
                                                        {item.severity && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                {item.severity}
                                                            </Badge>
                                                        )}

                                                        {/* Iteration/Sprint */}
                                                        {iterationName && (
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <GitBranch className="h-4 w-4" />
                                                                <span className="text-xs">{iterationName}</span>
                                                            </div>
                                                        )}

                                                        {/* Area Path */}
                                                        {areaName && areaName !== selectedProject.name && (
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <FolderTree className="h-4 w-4" />
                                                                <span className="text-xs">{areaName}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Secondary Metadata Row */}
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                                        {/* Assigned To */}
                                                        {item.assignedToDisplayName && (
                                                            <div className="flex items-center gap-1.5">
                                                                <User className="h-4 w-4" />
                                                                <span className="text-xs">{item.assignedToDisplayName}</span>
                                                            </div>
                                                        )}

                                                        {/* Created Date */}
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="h-4 w-4" />
                                                            <span className="text-xs">
                                                                Created {formatDate(item.createdDate)}
                                                            </span>
                                                        </div>

                                                        {/* Story Points */}
                                                        {item.storyPoints !== undefined && item.storyPoints !== null && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Target className="h-4 w-4" />
                                                                <span className="text-xs">{item.storyPoints} pts</span>
                                                            </div>
                                                        )}

                                                        {/* Relationships */}
                                                        {(item.childWorkItemsCount > 0 || item.relatedWorkItemsCount > 0 || item.linkedPullRequestsCount > 0) && (
                                                            <div className="flex items-center gap-2">
                                                                {item.childWorkItemsCount > 0 && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {item.childWorkItemsCount} child{item.childWorkItemsCount > 1 ? 'ren' : ''}
                                                                    </Badge>
                                                                )}
                                                                {item.relatedWorkItemsCount > 0 && (
                                                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                        <Link2 className="h-3 w-3" />
                                                                        {item.relatedWorkItemsCount}
                                                                    </Badge>
                                                                )}
                                                                {item.linkedPullRequestsCount > 0 && (
                                                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                        <GitPullRequest className="h-3 w-3" />
                                                                        {item.linkedPullRequestsCount}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Tags */}
                                                    {item.tags && item.tags.length > 0 && (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {item.tags.map(tag => (
                                                                <Badge key={tag} variant="outline" className="text-xs">
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Description Preview (when collapsed) */}
                                                    {!isExpanded && item.description && (
                                                        <CardDescription className="line-clamp-2 text-sm">
                                                            {item.description.replace(/<[^>]*>/g, '').substring(0, 200)}
                                                            {item.description.length > 200 && '...'}
                                                        </CardDescription>
                                                    )}
                                                </div>

                                                {/* Assigned To Avatar */}
                                                {item.assignedToAvatarUrl && (
                                                    <img
                                                        src={item.assignedToAvatarUrl}
                                                        alt={item.assignedToDisplayName || 'User'}
                                                        className="w-10 h-10 rounded-full flex-shrink-0"
                                                    />
                                                )}
                                            </div>
                                        </CardHeader>

                                        {/* Expanded Details*/}
                                        {isExpanded && (
                                            <CardContent className="pt-0 space-y-4">
                                                <div className="border-t pt-4 space-y-4">
                                                    {/* Effort & Planning */}
                                                    {(item.effort || item.originalEstimate || item.remainingWork || item.completedWork || item.businessValue) && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                <TrendingUp className="h-4 w-4" />
                                                                Effort & Planning
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                                {item.effort !== undefined && item.effort !== null && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Effort</div>
                                                                        <div className="font-medium">{item.effort}h</div>
                                                                    </div>
                                                                )}
                                                                {item.originalEstimate !== undefined && item.originalEstimate !== null && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Original Est.</div>
                                                                        <div className="font-medium">{item.originalEstimate}h</div>
                                                                    </div>
                                                                )}
                                                                {item.remainingWork !== undefined && item.remainingWork !== null && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Remaining</div>
                                                                        <div className="font-medium">{item.remainingWork}h</div>
                                                                    </div>
                                                                )}
                                                                {item.completedWork !== undefined && item.completedWork !== null && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Completed</div>
                                                                        <div className="font-medium">{item.completedWork}h</div>
                                                                    </div>
                                                                )}
                                                                {item.businessValue !== undefined && item.businessValue !== null && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Business Value</div>
                                                                        <div className="font-medium">{item.businessValue}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Dates & Timeline */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            Dates & Timeline
                                                        </h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                            <div>
                                                                <div className="text-muted-foreground text-xs">Created</div>
                                                                <div className="font-medium">{formatDate(item.createdDate)}</div>
                                                                {item.createdBy && <div className="text-xs text-muted-foreground">by {item.createdBy}</div>}
                                                            </div>
                                                            {item.changedDate && (
                                                                <div>
                                                                    <div className="text-muted-foreground text-xs">Last Updated</div>
                                                                    <div className="font-medium">{formatDate(item.changedDate)}</div>
                                                                    {item.changedBy && <div className="text-xs text-muted-foreground">by {item.changedBy}</div>}
                                                                </div>
                                                            )}
                                                            {item.dueDate && (
                                                                <div>
                                                                    <div className="text-muted-foreground text-xs">Due Date</div>
                                                                    <div className="font-medium">{formatDate(item.dueDate)}</div>
                                                                </div>
                                                            )}
                                                            {item.activatedDate && (
                                                                <div>
                                                                    <div className="text-muted-foreground text-xs">Activated</div>
                                                                    <div className="font-medium">{formatDate(item.activatedDate)}</div>
                                                                    {item.activatedBy && <div className="text-xs text-muted-foreground">by {item.activatedBy}</div>}
                                                                </div>
                                                            )}
                                                            {item.resolvedDate && (
                                                                <div>
                                                                    <div className="text-muted-foreground text-xs">Resolved</div>
                                                                    <div className="font-medium">{formatDate(item.resolvedDate)}</div>
                                                                    {item.resolvedBy && <div className="text-xs text-muted-foreground">by {item.resolvedBy}</div>}
                                                                </div>
                                                            )}
                                                            {item.closedDate && (
                                                                <div>
                                                                    <div className="text-muted-foreground text-xs">Closed</div>
                                                                    <div className="font-medium">{formatDate(item.closedDate)}</div>
                                                                    {item.closedBy && <div className="text-xs text-muted-foreground">by {item.closedBy}</div>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Process Info */}
                                                    {(item.reason || item.activity || item.valueArea || item.risk) && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                <Activity className="h-4 w-4" />
                                                                Process Information
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                                {item.reason && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Reason</div>
                                                                        <div className="font-medium">{item.reason}</div>
                                                                    </div>
                                                                )}
                                                                {item.activity && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Activity</div>
                                                                        <div className="font-medium">{item.activity}</div>
                                                                    </div>
                                                                )}
                                                                {item.valueArea && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Value Area</div>
                                                                        <div className="font-medium">{item.valueArea}</div>
                                                                    </div>
                                                                )}
                                                                {item.risk && (
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">Risk</div>
                                                                        <div className="font-medium">{item.risk}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Parent Work Item */}
                                                    {item.parentWorkItemId && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                <Link2 className="h-4 w-4" />
                                                                Parent Work Item
                                                            </h4>
                                                            <div className="text-sm">
                                                                <code className="text-xs">#{item.parentWorkItemId}</code>
                                                                {item.parentWorkItemTitle && <span className="ml-2">{item.parentWorkItemTitle}</span>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Description */}
                                                    {item.description && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                <FileText className="h-4 w-4" />
                                                                Description
                                                            </h4>
                                                            <div
                                                                className="text-sm text-muted-foreground prose prose-sm max-w-none"
                                                                dangerouslySetInnerHTML={{ __html: item.description }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Acceptance Criteria */}
                                                    {item.acceptanceCriteria && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold">Acceptance Criteria</h4>
                                                            <div
                                                                className="text-sm text-muted-foreground prose prose-sm max-w-none"
                                                                dangerouslySetInnerHTML={{ __html: item.acceptanceCriteria }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Repro Steps (for bugs) */}
                                                    {item.reproSteps && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold">Repro Steps</h4>
                                                            <div
                                                                className="text-sm text-muted-foreground prose prose-sm max-w-none"
                                                                dangerouslySetInnerHTML={{ __html: item.reproSteps }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* System Info (for bugs) */}
                                                    {item.systemInfo && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold">System Information</h4>
                                                            <div
                                                                className="text-sm text-muted-foreground prose prose-sm max-w-none"
                                                                dangerouslySetInnerHTML={{ __html: item.systemInfo }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
