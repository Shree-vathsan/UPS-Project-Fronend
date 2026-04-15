import { useState, useEffect } from 'react';
import {
    UserMinus, Users, AlertTriangle, CheckCircle, Clock,
    ChevronDown, ChevronUp, RefreshCw, Activity, Target, Zap, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { azureDevOpsApi } from '../lib/azureDevOpsApi';
import { DeveloperInactivityReport, DeveloperActivityProfile } from '../lib/azureDevOpsTypes';

interface DeveloperInactivityPanelProps {
    projectId: string;
}

const levelConfig: Record<string, {
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
    dotColor: string;
    label: string;
}> = {
    'Active': { badgeVariant: 'default', dotColor: 'bg-emerald-500', label: 'Active' },
    'Low Risk': { badgeVariant: 'secondary', dotColor: 'bg-blue-500', label: 'Low Risk' },
    'Moderate': { badgeVariant: 'outline', dotColor: 'bg-yellow-500', label: 'Moderate' },
    'At Risk': { badgeVariant: 'destructive', dotColor: 'bg-orange-500', label: 'At Risk' },
    'Inactive': { badgeVariant: 'destructive', dotColor: 'bg-red-500', label: 'Inactive' },
};

function getConfig(level: string) {
    return levelConfig[level] || levelConfig['Moderate'];
}

function formatRelativeDate(dateStr?: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DeveloperInactivityPanel({ projectId }: DeveloperInactivityPanelProps) {
    const [report, setReport] = useState<DeveloperInactivityReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedDev, setExpandedDev] = useState<string | null>(null);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await azureDevOpsApi.getDeveloperInactivity(projectId);
            setReport(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load inactivity report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchReport();
        }
    }, [projectId]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-6">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Failed to load inactivity data</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{error}</p>
                    <button
                        onClick={fetchReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
                    >
                        <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                </CardContent>
            </Card>
        );
    }

    if (!report || report.developers.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* Section Header — same style as "FORESITE Work Items" */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-heading text-2xl font-semibold">Developer Activity</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {report.totalDevelopers} developer{report.totalDevelopers !== 1 ? 's' : ''} tracked
                        {report.atRiskCount > 0 && ` · ${report.atRiskCount} at risk`}
                        {report.inactiveCount > 0 && ` · ${report.inactiveCount} inactive`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {report.activeCount} active
                    </Badge>
                    {report.atRiskCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {report.atRiskCount} at risk
                        </Badge>
                    )}
                    <button
                        onClick={fetchReport}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                        title="Refresh"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Developer Cards — flat grid matching work item card style */}
            <div className="grid gap-4">
                {report.developers.map((dev) => (
                    <DeveloperCard
                        key={dev.developerName}
                        developer={dev}
                        isExpanded={expandedDev === dev.developerName}
                        onToggle={() => setExpandedDev(
                            expandedDev === dev.developerName ? null : dev.developerName
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

function DeveloperCard({
    developer: dev,
    isExpanded,
    onToggle
}: {
    developer: DeveloperActivityProfile;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const config = getConfig(dev.inactivityLevel);

    return (
        <Card className="hover-lift">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        {/* Developer identity row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Avatar */}
                            {dev.avatarUrl ? (
                                <img
                                    src={dev.avatarUrl}
                                    alt={dev.developerName}
                                    className="h-6 w-6 rounded-full"
                                />
                            ) : (
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                    <span className="text-[10px] font-medium text-muted-foreground">
                                        {dev.developerName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}

                            <CardTitle className="text-base leading-tight">
                                {dev.developerName}
                            </CardTitle>

                            {/* Inactivity level badge */}
                            <Badge variant={config.badgeVariant} className="text-xs">
                                <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor} mr-1.5`} />
                                {dev.inactivityLevel}
                            </Badge>

                            {/* Score */}
                            <code className="text-xs text-muted-foreground font-mono">
                                Score: {dev.inactivityScore}
                            </code>

                            {/* Expand toggle */}
                            <button
                                onClick={onToggle}
                                className="ml-auto px-2 py-1 text-xs rounded hover:bg-muted transition-colors flex items-center gap-1"
                            >
                                {isExpanded ? (
                                    <><ChevronUp className="h-3 w-3" /> Less</>
                                ) : (
                                    <><ChevronDown className="h-3 w-3" /> Details</>
                                )}
                            </button>
                        </div>

                        {/* Metadata row — same style as work item cards */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Activity className="h-4 w-4" />
                                <span className="text-xs">
                                    {dev.activeItemCount} active / {dev.totalItemCount} total items
                                </span>
                            </div>

                            {dev.totalStoryPoints > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Target className="h-4 w-4" />
                                    <span className="text-xs">{dev.totalStoryPoints} story points</span>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span className="text-xs">
                                    Updated {formatRelativeDate(dev.lastWorkItemUpdate)}
                                </span>
                            </div>

                            {dev.estimatedWorkDaysRemaining > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs">
                                        ~{dev.estimatedWorkDaysRemaining.toFixed(1)} days remaining
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${config.dotColor}`}
                                    style={{ width: `${dev.inactivityScore}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground font-mono w-8 text-right">
                                {dev.inactivityScore}%
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            {/* Expanded section */}
            {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                    {/* Reasoning */}
                    <div className="rounded-md bg-muted/50 px-3 py-2.5">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground">Analysis: </span>
                            {dev.reasoning}
                        </p>
                    </div>

                    {/* Assigned work items */}
                    {dev.assignedItems.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Assigned Work Items
                            </h4>
                            <div className="space-y-1.5">
                                {dev.assignedItems.slice(0, 5).map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.state === 'Active' || item.state === 'In Progress' ? 'bg-blue-500' :
                                                item.state === 'Closed' || item.state === 'Done' ? 'bg-emerald-500' :
                                                    item.state === 'New' || item.state === 'To Do' ? 'bg-gray-400' :
                                                        'bg-yellow-500'
                                            }`} />
                                        <span className="truncate flex-1">{item.title}</span>
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                            {item.state}
                                        </Badge>
                                        {item.storyPoints != null && (
                                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                                {item.storyPoints} pts
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {dev.assignedItems.length > 5 && (
                                    <p className="text-xs text-muted-foreground pl-4">
                                        +{dev.assignedItems.length - 5} more items
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
