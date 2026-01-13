import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, GitCommit, FileCode, Award, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '../config';
import { useUserRole } from '../hooks/useRoleManagement';

interface TeamContributorAnalysisProps {
    repositoryId: string;
}

interface Team {
    id: string;
    name: string;
    members: Array<{
        id: string;
        userId: string;
        username: string;
        role: string;
    }>;
}

export function TeamContributorAnalysis({ repositoryId }: TeamContributorAnalysisProps) {
    // Memoize user to prevent infinite loops
    const user = useMemo(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : {};
    }, []);

    const userId = user?.id || localStorage.getItem('userId') || '';

    // Use role detection - owners and admins can view analytics
    const { data: userRole } = useUserRole(repositoryId, userId);
    const canViewAnalytics = (userRole?.isOwner || userRole?.isAdmin) ?? false;

    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    useEffect(() => {
        if (repositoryId && userId) {
            fetchTeams();
        }
    }, [repositoryId, userId]);

    useEffect(() => {
        if (selectedTeamId) {
            fetchAnalytics();
        } else {
            setAnalytics(null);
        }
    }, [selectedTeamId, selectedMemberId]);

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

    const fetchAnalytics = async () => {
        if (!selectedTeamId) return;

        setAnalyticsLoading(true);
        try {
            const url = selectedMemberId
                ? `${API_BASE_URL}/repositories/${repositoryId}/teams/${selectedTeamId}/analytics?memberId=${selectedMemberId}`
                : `${API_BASE_URL}/repositories/${repositoryId}/teams/${selectedTeamId}/analytics`;

            const response = await fetch(url, { credentials: 'include' });

            if (!response.ok) {
                console.error('API error:', response.status, response.statusText);
                const text = await response.text();
                console.error('Error response:', text);
                setAnalytics(null);
                return;
            }

            const data = await response.json();
            console.log('Analytics data:', data);
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setAnalytics(null);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const selectedTeam = teams.find(t => t.id === selectedTeamId);

    if (loading && teams.length === 0) {
        return <div className="text-center py-8">Loading...</div>;
    }

    if (!canViewAnalytics) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-heading text-lg font-semibold mb-2">Admin Access Required</h3>
                    <p className="text-muted-foreground text-sm">
                        Only repository owners and admins can view team contribution analytics.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (teams.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-heading text-lg font-semibold mb-2">No Teams Yet</h3>
                    <p className="text-muted-foreground text-sm">
                        Create teams first to view contribution analytics
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Selectors */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Team & Member</CardTitle>
                    <CardDescription>Choose a team to analyze, or select an individual member</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Team</label>
                            <select
                                value={selectedTeamId}
                                onChange={(e) => {
                                    setSelectedTeamId(e.target.value);
                                    setSelectedMemberId('');
                                }}
                                className="w-full px-3 py-2 border rounded bg-background text-foreground"
                            >
                                <option value="">Select a team...</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} ({team.members.length} members)
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedTeam && selectedTeam.members.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Member (Optional)</label>
                                <select
                                    value={selectedMemberId}
                                    onChange={(e) => setSelectedMemberId(e.target.value)}
                                    className="w-full px-3 py-2 border rounded bg-background text-foreground"
                                >
                                    <option value="">All Members (Team View)</option>
                                    {selectedTeam.members.map((member) => (
                                        <option key={member.userId} value={member.userId}>
                                            {member.username} - {member.role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Analytics Display */}
            {analyticsLoading && (
                <div className="space-y-6">
                    {/* Skeleton for stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i}>
                                <CardContent className="pt-6">
                                    <div className="animate-pulse">
                                        <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                                        <div className="h-8 bg-muted rounded w-16"></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {/* Skeleton for main content */}
                    <Card>
                        <CardHeader>
                            <div className="animate-pulse">
                                <div className="h-6 bg-muted rounded w-40 mb-2"></div>
                                <div className="h-4 bg-muted rounded w-64"></div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!analyticsLoading && analytics && !selectedMemberId && (
                <TeamAnalyticsView analytics={analytics} />
            )}

            {!analyticsLoading && analytics && selectedMemberId && (
                <IndividualAnalyticsView analytics={analytics} />
            )}
        </div>
    );
}

// Team-level analytics view
function TeamAnalyticsView({ analytics }: { analytics: any }) {
    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Commits"
                    value={analytics.totalCommits || 0}
                    icon={<GitCommit className="h-5 w-5" />}
                />
                <StatCard
                    title="Team Members"
                    value={analytics.totalMembers || 0}
                    icon={<Users className="h-5 w-5" />}
                />
                <StatCard
                    title="Files Changed"
                    value={analytics.totalFilesChanged || 0}
                    icon={<FileCode className="h-5 w-5" />}
                />
                <StatCard
                    title="Lines Added"
                    value={(analytics.totalLinesAdded || 0).toLocaleString()}
                    icon={<TrendingUp className="h-5 w-5" />}
                    subtitle={`${(analytics.totalLinesRemoved || 0).toLocaleString()} removed`}
                />
            </div>

            {/* Member Contributions */}
            <Card>
                <CardHeader>
                    <CardTitle>Member Contributions</CardTitle>
                    <CardDescription>Individual breakdown of team member activity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analytics.memberContributions?.map((member: any) => (
                            <div key={member.userId} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                        {member.username?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{member.username}</span>
                                            <Badge variant={member.role === 'team_leader' ? 'default' : 'secondary'}>
                                                {member.role === 'team_leader' ? 'Team Leader' : 'Contributor'}
                                            </Badge>
                                            {member.isActive && <Badge variant="success">Active</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {member.totalCommits} commits · {member.filesChanged} files ·
                                            +{member.linesAdded}/-{member.linesRemoved} lines
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                    {member.lastCommitDate && (
                                        <span>Last: {new Date(member.lastCommitDate).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Hotspots */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Hotspots</CardTitle>
                    <CardDescription>Most frequently changed files by the team</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {analytics.hotspots?.slice(0, 10).map((hotspot: any, idx: number) => (
                            <div key={hotspot.fileId} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                                    <code className="text-sm truncate">{hotspot.filePath}</code>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        {hotspot.contributors.length} contributor{hotspot.contributors.length > 1 ? 's' : ''}
                                    </span>
                                    <Badge variant="secondary">{hotspot.changeCount} changes</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Activity Timeline & File Types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Timeline</CardTitle>
                        <CardDescription>Last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {analytics.activityTimeline?.slice(-15).map((day: any) => (
                                <div key={day.date} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{day.date}</span>
                                    <div className="flex gap-4">
                                        <span>{day.commits} commits</span>
                                        <span className="text-green-500">+{day.linesAdded}</span>
                                        <span className="text-red-500">-{day.linesRemoved}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>File Type Distribution</CardTitle>
                        <CardDescription>What the team works on</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(analytics.fileTypeDistribution || {}).map(([type, count]: any) => (
                                <div key={type} className="flex items-center justify-between">
                                    <code className="text-sm">.{type}</code>
                                    <Badge variant="outline">{count} changes</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Info */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Most Active Day</p>
                            <p className="text-lg font-semibold">{analytics.mostActiveDay}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">First Commit</p>
                            <p className="text-lg font-semibold">
                                {analytics.firstCommitDate ? new Date(analytics.firstCommitDate).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Last Commit</p>
                            <p className="text-lg font-semibold">
                                {analytics.lastCommitDate ? new Date(analytics.lastCommitDate).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Active Members</p>
                            <p className="text-lg font-semibold">
                                {analytics.memberContributions?.filter((m: any) => m.isActive).length || 0}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Individual analytics view
function IndividualAnalyticsView({ analytics }: { analytics: any }) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                            {analytics.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <CardTitle>{analytics.username}</CardTitle>
                            <CardDescription>
                                {analytics.role === 'team_leader' ? 'Team Leader' : 'Contributor'} · {analytics.teamName}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Commits" value={analytics.totalCommits || 0} icon={<GitCommit className="h-5 w-5" />} />
                <StatCard title="Files Changed" value={analytics.filesChanged || 0} icon={<FileCode className="h-5 w-5" />} />
                <StatCard
                    title="Lines Added"
                    value={(analytics.linesAdded || 0).toLocaleString()}
                    icon={<TrendingUp className="h-5 w-5" />}
                    subtitle={`${(analytics.linesRemoved || 0).toLocaleString()} removed`}
                />
                <StatCard title="Avg/Day" value={analytics.averageCommitsPerDay || 0} icon={<Clock className="h-5 w-5" />} />
            </div>

            {/* Personal Hotspots */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Hotspots</CardTitle>
                    <CardDescription>Files you work on most</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {analytics.personalHotspots?.map((hotspot: any, idx: number) => (
                            <div key={hotspot.fileId} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                                    <code className="text-sm truncate">{hotspot.filePath}</code>
                                </div>
                                <Badge variant="secondary">{hotspot.changeCount} changes</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Code Ownership */}
            {analytics.codeOwnership?.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Code Ownership</CardTitle>
                        <CardDescription>Files you have significant ownership of</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {analytics.codeOwnership.map((file: string, idx: number) => (
                                <div key={idx} className="text-sm">
                                    <code>{file}</code>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Timeline & File Types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Timeline</CardTitle>
                        <CardDescription>Last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {analytics.activityTimeline?.map((day: any) => (
                                <div key={day.date} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{day.date}</span>
                                    <div className="flex gap-4">
                                        <span>{day.commits} commits</span>
                                        <span className="text-green-500">+{day.linesAdded}</span>
                                        <span className="text-red-500">-{day.linesRemoved}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>File Types</CardTitle>
                        <CardDescription>Your focus areas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(analytics.fileTypeDistribution || {}).map(([type, count]: any) => (
                                <div key={type} className="flex items-center justify-between">
                                    <code className="text-sm">.{type}</code>
                                    <Badge variant="outline">{count} changes</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Info */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Most Active Day</p>
                            <p className="text-lg font-semibold">{analytics.mostActiveDay}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">First Commit</p>
                            <p className="text-lg font-semibold">
                                {analytics.firstCommitDate ? new Date(analytics.firstCommitDate).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Last Commit</p>
                            <p className="text-lg font-semibold">
                                {analytics.lastCommitDate ? new Date(analytics.lastCommitDate).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Stat Card Component
function StatCard({ title, value, icon, subtitle }: { title: string; value: any; icon: React.ReactNode; subtitle?: string }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                    <div className="text-primary">{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
}
