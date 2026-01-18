import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, Users, GitCommit, FileCode, Award, Clock, Download, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE_URL } from '../config';
import { useUserRole } from '../hooks/useRoleManagement';
import { api } from '../utils/api';

interface TeamContributorAnalysisProps {
    repositoryId: string;
    timelineDays?: 0 | 7 | 30;  // 0 = Lifetime, 7 = Past 7 Days, 30 = Past 30 Days
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

export function TeamContributorAnalysis({ repositoryId, timelineDays = 7 }: TeamContributorAnalysisProps) {
    // Memoize user to prevent infinite loops
    const user = useMemo(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : {};
    }, []);

    const userId = user?.id || localStorage.getItem('userId') || '';

    // Use role detection - owners and admins can view all analytics
    const { data: userRole } = useUserRole(repositoryId, userId);
    const canManageAllTeams = (userRole?.isOwner || userRole?.isAdmin) ?? false;

    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    useEffect(() => {
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

        if (repositoryId && userId) {
            fetchTeams();
        }
    }, [repositoryId, userId]);

    // Determine which teams the user is a team leader of
    const teamsUserLeads = useMemo(() => {
        return teams.filter(team =>
            team.members.some(m => m.userId === userId && m.role === 'team_leader')
        );
    }, [teams, userId]);

    // Determine which teams the user is a contributor of
    const teamsUserContributes = useMemo(() => {
        return teams.filter(team =>
            team.members.some(m => m.userId === userId && m.role === 'contributor')
        );
    }, [teams, userId]);

    // Is the user a regular contributor only (not team leader or admin)?
    const isContributorOnly = !canManageAllTeams && teamsUserLeads.length === 0 && teamsUserContributes.length > 0;

    // User can view analytics if admin/owner, team leader, OR contributor
    const canViewAnalytics = canManageAllTeams || teamsUserLeads.length > 0 || teamsUserContributes.length > 0;

    // Teams to show: all for admins, led teams for leaders, contributed teams for contributors
    const teamsToShow = canManageAllTeams ? teams : (teamsUserLeads.length > 0 ? teamsUserLeads : teamsUserContributes);

    // Auto-select team for non-admins with only one team
    useEffect(() => {
        if (!canManageAllTeams && teamsToShow.length === 1 && !selectedTeamId) {
            setSelectedTeamId(teamsToShow[0].id);
        }
    }, [teamsToShow, canManageAllTeams, selectedTeamId]);

    // Auto-select themselves as member for contributors
    useEffect(() => {
        if (isContributorOnly && selectedTeamId && !selectedMemberId) {
            setSelectedMemberId(userId);
        }
    }, [isContributorOnly, selectedTeamId, selectedMemberId, userId]);

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            if (!selectedTeamId) {
                setAnalytics(null);
                return;
            }

            setAnalyticsLoading(true);
            try {
                let url = selectedMemberId
                    ? `${API_BASE_URL}/repositories/${repositoryId}/teams/${selectedTeamId}/analytics?memberId=${selectedMemberId}`
                    : `${API_BASE_URL}/repositories/${repositoryId}/teams/${selectedTeamId}/analytics`;

                // Add timelineDays parameter
                url += selectedMemberId ? `&timelineDays=${timelineDays}` : `?timelineDays=${timelineDays}`;

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

        fetchAnalyticsData();
    }, [selectedTeamId, selectedMemberId, timelineDays, repositoryId]);

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const selectedMember = selectedTeam?.members.find(m => m.userId === selectedMemberId);

    // Context-aware export function - exports exactly what's visible
    const handleExportPdf = async () => {
        if (!analytics) return;

        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        // Colors
        const primaryColor: [number, number, number] = [59, 130, 246];
        const textColor: [number, number, number] = [55, 65, 81];
        const mutedColor: [number, number, number] = [107, 114, 128];

        // Determine context for title
        const isIndividual = !!selectedMemberId;
        const contextTitle = isIndividual
            ? `${analytics.username || selectedMember?.username || 'Member'} - Individual Analysis`
            : `${selectedTeam?.name || 'Team'} - Team Analysis`;

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Contributor Analytics', 14, 18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(contextTitle, 14, 28);

        // Generated date
        doc.setTextColor(...mutedColor);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 45);

        let yPos = 55;

        if (isIndividual) {
            // Individual Member Export
            doc.setTextColor(...textColor);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Member Overview', 14, yPos);
            yPos += 8;

            const memberData = [
                ['Username', analytics.username || 'N/A'],
                ['Role', analytics.role === 'team_leader' ? 'Team Leader' : 'Contributor'],
                ['Team', analytics.teamName || selectedTeam?.name || 'N/A'],
                ['Total Commits', String(analytics.totalCommits || 0)],
                ['Files Changed', String(analytics.filesChanged || 0)],
                ['Lines Added', String(analytics.linesAdded || 0)],
                ['Lines Removed', String(analytics.linesRemoved || 0)],
                ['Avg Commits/Day', String(analytics.averageCommitsPerDay || 0)],
                ['Most Active Day', analytics.mostActiveDay || 'N/A'],
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Metric', 'Value']],
                body: memberData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                margin: { left: 14, right: 14 },
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;

            // Personal Hotspots
            if (analytics.personalHotspots?.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Personal Hotspots', 14, yPos);
                yPos += 8;

                const hotspotsData = analytics.personalHotspots.slice(0, 10).map((h: any, i: number) => [
                    String(i + 1),
                    h.filePath?.split('/').pop() || h.filePath,
                    String(h.changes || h.changeCount || 0)
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['#', 'File', 'Changes']],
                    body: hotspotsData,
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor },
                    margin: { left: 14, right: 14 },
                });
            }
        } else {
            // Team Export
            doc.setTextColor(...textColor);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Team Overview', 14, yPos);
            yPos += 8;

            const teamData = [
                ['Team Name', selectedTeam?.name || 'N/A'],
                ['Total Members', String(analytics.totalMembers || selectedTeam?.members.length || 0)],
                ['Total Commits', String(analytics.totalCommits || 0)],
                ['Files Changed', String(analytics.totalFilesChanged || 0)],
                ['Lines Added', String(analytics.totalLinesAdded || 0)],
                ['Lines Removed', String(analytics.totalLinesRemoved || 0)],
                ['Most Active Day', analytics.mostActiveDay || 'N/A'],
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Metric', 'Value']],
                body: teamData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                margin: { left: 14, right: 14 },
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;

            // Member Contributions
            if (analytics.memberContributions?.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Member Contributions', 14, yPos);
                yPos += 8;

                const contributorsData = analytics.memberContributions.map((m: any) => [
                    m.username || 'Unknown',
                    String(m.totalCommits || 0),
                    String(m.filesChanged || 0),
                    `+${m.linesAdded || 0}/-${m.linesRemoved || 0}`,
                    m.isActive ? 'Active' : 'Inactive'
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Member', 'Commits', 'Files', 'Lines', 'Status']],
                    body: contributorsData,
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor },
                    margin: { left: 14, right: 14 },
                });

                yPos = (doc as any).lastAutoTable.finalY + 15;
            }

            // Team Hotspots
            if (analytics.hotspots?.length > 0 && yPos < 220) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Team Hotspots', 14, yPos);
                yPos += 8;

                const hotspotsData = analytics.hotspots.slice(0, 8).map((h: any, i: number) => [
                    String(i + 1),
                    h.filePath?.split('/').pop() || h.filePath,
                    String(h.changes || h.changeCount || 0)
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['#', 'File', 'Changes']],
                    body: hotspotsData,
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor },
                    margin: { left: 14, right: 14 },
                });
            }
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setTextColor(...mutedColor);
            doc.setFontSize(8);
            doc.text(
                `Page ${i} of ${pageCount} • ForeSite Contributor Analytics`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }

        // Save with context-aware filename
        const filename = isIndividual
            ? `${analytics.username || 'member'}-contributor-analytics.pdf`
            : `${selectedTeam?.name || 'team'}-contributor-analytics.pdf`;
        doc.save(filename);
    };

    if (loading && teams.length === 0) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-8 w-16" />
                </div>

                {/* Selector Card Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="pt-6">
                                <Skeleton className="h-4 w-20 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Member Contributions Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div>
                                            <Skeleton className="h-4 w-32 mb-1" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!canViewAnalytics) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-heading text-lg font-semibold mb-2">Access Required</h3>
                    <p className="text-muted-foreground text-sm">
                        Only repository owners, admins, team leaders, and team members can view contributor analytics.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (teamsToShow.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-heading text-lg font-semibold mb-2">
                        {canManageAllTeams ? 'No Teams Yet' : 'No Teams to View'}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        {canManageAllTeams
                            ? 'Create teams first to view contribution analytics'
                            : 'You are not a member of any teams'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Contributor Analytics Header with Export Button */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-heading font-bold">Contributor Analytics</h2>
                {analytics && (
                    <button
                        onClick={handleExportPdf}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export</span>
                    </button>
                )}
            </div>

            {/* Selectors */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {isContributorOnly
                            ? 'Your Contribution Analytics'
                            : (!canManageAllTeams && teamsToShow.length === 1
                                ? 'Your Team Analytics'
                                : 'Select Team & Member')}
                    </CardTitle>
                    <CardDescription>
                        {isContributorOnly
                            ? 'View your personal contribution statistics'
                            : (!canManageAllTeams && teamsToShow.length === 1
                                ? 'Viewing analytics for your team'
                                : 'Choose a team to analyze, or select an individual member')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Team</label>
                            {/* For single-team users, show team name directly */}
                            {!canManageAllTeams && teamsToShow.length === 1 ? (
                                <div className="flex items-center gap-2 px-3 py-2 border rounded bg-muted/50">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{teamsToShow[0].name}</span>
                                    <span className="text-muted-foreground text-sm">
                                        ({teamsToShow[0].members.length} members)
                                    </span>
                                </div>
                            ) : (
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => {
                                        setSelectedTeamId(e.target.value);
                                        setSelectedMemberId('');
                                    }}
                                    className="w-full px-3 py-2 border rounded bg-background text-foreground"
                                >
                                    <option value="">Select a team...</option>
                                    {teamsToShow.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} ({team.members.length} members)
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {/* Member selector: hidden for contributors */}
                        {selectedTeam && selectedTeam.members.length > 0 && !isContributorOnly && (
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
                        {/* For contributors, show their name directly */}
                        {isContributorOnly && selectedTeam && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Member</label>
                                <div className="flex items-center gap-2 px-3 py-2 border rounded bg-muted/50">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                                        {user?.username?.substring(0, 2).toUpperCase() || 'ME'}
                                    </div>
                                    <span className="font-medium">{user?.username || 'You'}</span>
                                    <Badge variant="secondary">Contributor</Badge>
                                </div>
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
                <TeamAnalyticsView
                    analytics={analytics}
                    repositoryId={repositoryId}
                    userId={userId}
                    username={user?.username || ''}
                    canManageAllTeams={canManageAllTeams}
                    isTeamLeader={teamsUserLeads.length > 0}
                    isContributorOnly={isContributorOnly}
                    timelineDays={timelineDays}
                />
            )}

            {!analyticsLoading && analytics && selectedMemberId && (
                <IndividualAnalyticsView analytics={analytics} />
            )}
        </div>
    );
}

// Team-level analytics view
function TeamAnalyticsView({
    analytics,
    repositoryId,
    userId,
    username,
    canManageAllTeams,
    isTeamLeader,
    isContributorOnly,
    timelineDays
}: {
    analytics: any;
    repositoryId: string;
    userId: string;
    username: string;
    canManageAllTeams: boolean;
    isTeamLeader: boolean;
    isContributorOnly: boolean;
    timelineDays: 0 | 7 | 30;
}) {
    const [negativeScores, setNegativeScores] = useState<any>(null);
    const [loadingScores, setLoadingScores] = useState(false);
    const [calculating, setCalculating] = useState(false);

    // Modal state for event details
    const [selectedContributor, setSelectedContributor] = useState<string | null>(null);
    const [contributorEvents, setContributorEvents] = useState<any>(null);
    const [loadingEvents, setLoadingEvents] = useState(false);

    // Can calculate: admins/owners or team leaders
    const canCalculate = canManageAllTeams || isTeamLeader;

    useEffect(() => {
        fetchNegativeScores();
    }, [repositoryId, timelineDays]);

    const fetchNegativeScores = async () => {
        setLoadingScores(true);
        try {
            const data = await api.getNegativeScores(repositoryId, timelineDays);
            setNegativeScores(data);
        } catch (error) {
            console.error('Error fetching negative scores:', error);
        } finally {
            setLoadingScores(false);
        }
    };

    const handleCalculateScores = async () => {
        console.log('🔄 Calculate button clicked!');
        console.log('repositoryId:', repositoryId);
        console.log('userId:', userId);
        setCalculating(true);
        try {
            console.log('📡 Calling API...');
            const result = await api.calculateNegativeScores(repositoryId, userId);
            console.log('✅ API Response:', result);
            await fetchNegativeScores();
            console.log('✅ Scores refreshed');
        } catch (error) {
            console.error('❌ Error calculating negative scores:', error);
            alert('Error calculating scores: ' + (error as Error).message);
        } finally {
            setCalculating(false);
        }
    };

    const getScoreForMember = (username: string) => {
        if (!negativeScores?.scores) return null;
        return negativeScores.scores.find((s: any) =>
            s.contributorName?.toLowerCase() === username?.toLowerCase()
        );
    };

    const getScoreBadge = (level: string) => {
        switch (level) {
            case 'excellent': return <Badge variant="success" className="text-xs">Excellent</Badge>;
            case 'good': return <Badge variant="secondary" className="text-xs">Good</Badge>;
            case 'moderate': return <Badge variant="warning" className="text-xs">Moderate</Badge>;
            case 'elevated': return <Badge variant="destructive" className="text-xs">Elevated</Badge>;
            case 'high': return <Badge variant="destructive" className="text-xs">High Risk</Badge>;
            default: return null;
        }
    };

    const fetchContributorEvents = async (contributorName: string) => {
        setSelectedContributor(contributorName);
        setLoadingEvents(true);
        try {
            const data = await api.getContributorEvents(repositoryId, contributorName);
            setContributorEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            setContributorEvents({ events: [], eventCount: 0 });
        } finally {
            setLoadingEvents(false);
        }
    };

    const closeModal = () => {
        setSelectedContributor(null);
        setContributorEvents(null);
    };

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
                    {/* Calculate Scores Button for Admins and Team Leaders */}
                    {canCalculate && (
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {negativeScores?.scoredContributors
                                    ? `${negativeScores.scoredContributors} contributors scored`
                                    : 'Calculate instability scores to see contributor risk levels'}
                            </p>
                            <button
                                onClick={handleCalculateScores}
                                disabled={calculating}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${calculating ? 'animate-spin' : ''}`} />
                                {calculating ? 'Calculating...' : 'Calculate Scores'}
                            </button>
                        </div>
                    )}
                    <div className="space-y-3">
                        {analytics.memberContributions?.map((member: any) => {
                            // For contributors, only show their own score
                            const scoreData = getScoreForMember(member.username);
                            const shouldShowScore = !isContributorOnly || member.userId === userId || member.username?.toLowerCase() === username?.toLowerCase();

                            return (
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
                                                {shouldShowScore && scoreData && getScoreBadge(scoreData.level)}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {member.totalCommits} commits · {member.filesChanged} files ·
                                                +{member.linesAdded}/-{member.linesRemoved} lines
                                                {shouldShowScore && scoreData && scoreData.eventCount > 0 && (
                                                    <button
                                                        onClick={() => fetchContributorEvents(member.username)}
                                                        className="ml-2 text-amber-600 hover:text-amber-500 hover:underline cursor-pointer transition-colors"
                                                    >
                                                        · {scoreData.eventCount} instability event{scoreData.eventCount > 1 ? 's' : ''} →
                                                    </button>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        {shouldShowScore && scoreData && (
                                            <div className="flex items-center gap-1 mb-1 justify-end">
                                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                <span className="text-xs">{scoreData.normalizedScore.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {member.lastCommitDate && (
                                            <span>Last: {new Date(member.lastCommitDate).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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

            {/* Event Details Modal */}
            {selectedContributor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Instability Events for {selectedContributor}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {loadingEvents ? 'Loading...' : `${contributorEvents?.eventCount || 0} events found`}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-auto max-h-[60vh]">
                            {loadingEvents ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                                    ))}
                                </div>
                            ) : contributorEvents?.events?.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-3 font-medium">File</th>
                                            <th className="pb-3 font-medium">Replaced By</th>
                                            <th className="pb-3 font-medium text-center">Days After</th>
                                            <th className="pb-3 font-medium text-center">Lines</th>
                                            <th className="pb-3 font-medium text-center">Purpose</th>
                                            <th className="pb-3 font-medium text-right">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contributorEvents.events.map((event: any) => (
                                            <tr key={event.id} className="border-b last:border-0 hover:bg-muted/50">
                                                <td className="py-3">
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                                        {event.filePath?.split('/').pop() || event.filePath}
                                                    </code>
                                                </td>
                                                <td className="py-3 text-muted-foreground">{event.replacedBy}</td>
                                                <td className="py-3 text-center">
                                                    <span className={event.daysAfterOriginal <= 7 ? 'text-red-500' : 'text-muted-foreground'}>
                                                        {event.daysAfterOriginal}d
                                                    </span>
                                                </td>
                                                <td className="py-3 text-center text-muted-foreground">{event.linesChanged}</td>
                                                <td className="py-3 text-center">
                                                    {event.commitSignal > 1.5 ? (
                                                        <Badge variant="destructive" className="text-xs">bug fix</Badge>
                                                    ) : event.commitSignal > 1.0 ? (
                                                        <Badge variant="warning" className="text-xs">update</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs">general</Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right font-mono text-amber-600">{event.eventScore.toFixed(3)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No instability events recorded for this contributor.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t bg-muted/30 text-sm text-muted-foreground">
                            <p>
                                Events shown above represent instances where this contributor's code was significantly altered by another team member within 60 days.
                            </p>
                        </div>
                    </div>
                </div>
            )}
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
