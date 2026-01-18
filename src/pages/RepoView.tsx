import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { GitCommit, GitPullRequest, FolderTree, BarChart, RefreshCw, GitBranch, Clock, ArrowRight, StickyNote, Users, TrendingUp, Shield } from 'lucide-react';
import FileTree from '../components/FileTree';
import BackButton from '../components/BackButton';
import RepositoryAnalytics from '../components/RepositoryAnalytics';
import TeamInsights from '../components/TeamInsights';
import { RepositoryNotesTab } from '../components/RepositoryNotesTab';
import { TeamsTab } from '../components/TeamsTab';
import { TeamContributorAnalysis } from '../components/TeamContributorAnalysis';
import { AdminsTab } from '../components/AdminsTab';
import Pagination from '../components/Pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRepository, useBranches, useBranchCommits, usePullRequests, useBranchFiles, useRepositoryAnalytics, useTeamInsights } from '../hooks/useApiQueries';
import { useUserRole } from '../hooks/useRoleManagement';
import { useTheme } from '@/components/theme-provider';
import { API_BASE_URL } from '../config';

interface RepoViewProps {
    user: any;
}

export default function RepoView({ user: _user }: RepoViewProps) {
    const navigate = useNavigate();
    const { repositoryId } = useParams<{ repositoryId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { resolvedTheme } = useTheme();

    // Get user ID from user object (not from separate localStorage key)
    const storedUser = localStorage.getItem('user');
    const parsedUser = storedUser ? JSON.parse(storedUser) : {};
    const userId = parsedUser?.id || _user?.id || '';

    // Get user role
    const { data: userRole } = useUserRole(repositoryId, userId);
    const isOwner = userRole?.isOwner ?? false;

    // Get initial tab from URL or default to 'commits'
    const getInitialTab = (): 'commits' | 'prs' | 'files' | 'analytics' | 'notes' | 'teams' | 'admins' | 'contributor-analysis' => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'prs' || tabParam === 'files' || tabParam === 'analytics' || tabParam === 'commits' || tabParam === 'notes' || tabParam === 'teams' || tabParam === 'admins' || tabParam === 'contributor-analysis') {
            return tabParam as any;
        }
        return 'commits';
    };

    const [activeTab, setActiveTab] = useState<'commits' | 'prs' | 'files' | 'analytics' | 'notes' | 'teams' | 'admins' | 'contributor-analysis'>(getInitialTab());

    // Get initial branch from URL or default to 'main'
    const getInitialBranch = (): string => {
        return searchParams.get('branch') || 'main';
    };
    const [selectedBranch, setSelectedBranchState] = useState<string>(getInitialBranch());

    // PR filter state
    const [prFilter, setPrFilter] = useState<'all' | 'open' | 'closed'>('all');

    // Pagination state
    const [commitsPage, setCommitsPage] = useState(1);
    const [prsPage, setPrsPage] = useState(1);
    const itemsPerPage = 10;

    // Refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);

    // Analytics timeline filter state: 0 = Lifetime, 7 = Past 7 Days, 30 = Past 30 Days
    const [analyticsTimeline, setAnalyticsTimeline] = useState<0 | 7 | 30>(7);

    // React Query hooks for data fetching with caching
    const { data: repository, isLoading: loading, refetch: refetchRepository } = useRepository(repositoryId);
    const { data: branches = [] } = useBranches(repositoryId);
    const { data: commits = [] } = useBranchCommits(repositoryId, selectedBranch);
    const { data: allPrs = [] } = usePullRequests(repositoryId);
    const { data: files = [] } = useBranchFiles(repositoryId, selectedBranch);

    // Analytics data hooks for report download
    const { data: analyticsData } = useRepositoryAnalytics(repositoryId, selectedBranch, analyticsTimeline);
    const { data: teamData } = useTeamInsights(repositoryId, selectedBranch, analyticsTimeline);

    // Download analytics report as PDF
    const downloadAnalyticsReport = async () => {
        if (!repository || !analyticsData) return;

        // Dynamically import jsPDF to avoid SSR issues
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const timelineLabel = analyticsTimeline === 0 ? 'Lifetime' : `Past ${analyticsTimeline} Days`;
        const doc = new jsPDF();

        // Colors
        const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
        const textColor: [number, number, number] = [55, 65, 81];
        const mutedColor: [number, number, number] = [107, 114, 128];

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Analytics Report', 14, 18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${repository.name} • ${selectedBranch} • ${timelineLabel}`, 14, 28);

        // Generated date
        doc.setTextColor(...mutedColor);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 45);

        let yPos = 55;

        // Overview Section
        doc.setTextColor(...textColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Overview', 14, yPos);
        yPos += 8;

        // Metrics table
        const metricsData = [
            ['Total Files', String(analyticsData.totalFiles || 0)],
            ['Total Commits', String(analyticsData.totalCommits || 0)],
            ['Recent Commits', String(analyticsData.recentCommits || 0)],
            ['Contributors', String(analyticsData.contributors || 0)],
        ];

        if (teamData) {
            metricsData.push(
                ['Active Contributors', String(teamData.activeContributors || 0)],
                ['Most Active Day', teamData.mostActiveDay || 'N/A']
            );
        }

        autoTable(doc, {
            startY: yPos,
            head: [['Metric', 'Value']],
            body: metricsData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Hotspots Section
        if (analyticsData.hotspots && analyticsData.hotspots.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Code Hotspots', 14, yPos);
            yPos += 8;

            const hotspotsData = analyticsData.hotspots.slice(0, 10).map((h: any, i: number) => [
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
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 30 }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Team Contributors Section
        if (teamData?.contributors && teamData.contributors.length > 0) {
            // Check if we need a new page
            if (yPos > 220) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Top Contributors', 14, yPos);
            yPos += 8;

            const contributorsData = teamData.contributors.slice(0, 10).map((c: any) => [
                c.name || c.username || c.authorName || 'Unknown',
                String(c.commits || c.totalCommits || 0),
                c.active === true ? 'Active' : c.active === false ? 'Inactive' : (c.isActive === true ? 'Active' : c.isActive === false ? 'Inactive' : '-')
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Contributor', 'Commits', 'Status']],
                body: contributorsData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                margin: { left: 14, right: 14 },
            });
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setTextColor(...mutedColor);
            doc.setFontSize(8);
            doc.text(
                `Page ${i} of ${pageCount} • ForeSite Analytics`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }

        // Save
        doc.save(`${repository.name}-analytics-${timelineLabel.replace(' ', '-').toLowerCase()}.pdf`);
    };

    // Filter PRs based on prFilter
    const prs = prFilter === 'all'
        ? allPrs
        : allPrs.filter((pr: any) => pr.state === prFilter);

    // Helper to update branch and URL together
    const setSelectedBranch = (branch: string) => {
        setSelectedBranchState(branch);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('branch', branch);
        setSearchParams(newParams);
    };

    // Set default branch when branches load
    useEffect(() => {
        if (branches.length > 0) {
            const branchFromUrl = searchParams.get('branch');
            if (branchFromUrl && branches.some((b: any) => b.name === branchFromUrl)) {
                setSelectedBranchState(branchFromUrl);
            } else {
                const defaultBranch = branches.find((b: any) => b.isDefault);
                if (defaultBranch) {
                    setSelectedBranchState(defaultBranch.name);
                }
            }
        }
    }, [branches, searchParams]);

    // Auto-refresh on load if stale (> 1 hour)
    useEffect(() => {
        if (repository?.lastRefreshAt) {
            setLastRefreshTime(repository.lastRefreshAt);
            const lastRefresh = new Date(repository.lastRefreshAt);
            const now = new Date();
            const diffHours = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);

            if (diffHours > 1) {
                console.log("Repository is stale, triggering auto-refresh...");
                refreshRepository();
            }
        }
    }, [repository]);

    // Poll for updates when refreshing
    useEffect(() => {
        let interval: any;
        if (isRefreshing && repository) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/repositories/${repositoryId}`);
                    const data = await res.json();

                    // Check if timestamp updated
                    if (data.lastRefreshAt !== lastRefreshTime) {
                        setLastRefreshTime(data.lastRefreshAt);
                        setIsRefreshing(false);
                        // Refetch all data
                        refetchRepository();
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000); // Poll every 3 seconds
        }
        return () => clearInterval(interval);
    }, [isRefreshing, lastRefreshTime, repositoryId]);

    const refreshRepository = async () => {
        if (isRefreshing || !repositoryId) return;

        setIsRefreshing(true);
        try {
            await fetch(`${API_BASE_URL}/repositories/${repositoryId}/refresh`, {
                method: 'POST'
            });
            // Don't set isRefreshing(false) here - wait for polling to detect the change
        } catch (err) {
            console.error("Failed to trigger refresh:", err);
            setIsRefreshing(false);
            alert("Failed to start refresh");
        }
    };

    if (loading) {
        return (
            <div className="container-custom py-8">
                <Skeleton className="h-8 w-48 mb-6" />
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!repository) {
        return (
            <div className="container-custom py-8">
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="font-heading text-lg font-semibold">Repository not found</h3>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container-custom py-8 animate-fade-in">
            <BackButton to="/" label="Back to Dashboard" />

            {/* Repository Header */}
            <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <h1 className="font-heading text-3xl font-bold">
                                {repository.ownerUsername}/{repository.name}
                            </h1>
                            <Button
                                onClick={refreshRepository}
                                disabled={isRefreshing}
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </Button>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge variant={repository.status === 'ready' ? 'success' : 'warning'}>
                                {repository.status || 'unknown'}
                            </Badge>
                            {repository.lastRefreshAt && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>Updated {new Date(repository.lastRefreshAt).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Branch Selector */}
                    {branches.length > 0 && (
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={`gap-2 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}>
                                    <GitBranch className="h-4 w-4" />
                                    {selectedBranch}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {branches.map((branch: any) => (
                                    <DropdownMenuItem
                                        key={branch.id}
                                        onClick={() => setSelectedBranch(branch.name)}
                                        className={resolvedTheme === 'light' ? 'focus:bg-blue-100 focus:text-blue-700' : ''}
                                    >
                                        {branch.name} {branch.isDefault && '(default)'}
                                        {branch.name === selectedBranch && <span className="ml-auto">✓</span>}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => {
                const newTab = value as 'commits' | 'prs' | 'files' | 'analytics' | 'notes' | 'teams' | 'admins' | 'contributor-analysis';
                setActiveTab(newTab);
                const newParams = new URLSearchParams(searchParams);
                newParams.set('tab', newTab);
                setSearchParams(newParams);
            }}>
                {/* Tabs Row with Timeline Selector */}
                <div className="flex items-center gap-4 flex-wrap">
                    <TabsList className={`grid ${isOwner ? 'grid-cols-8' : 'grid-cols-7'}`}>
                        <TabsTrigger value="commits" className="gap-2">
                            <GitCommit className="h-4 w-4" />
                            <span className="hidden sm:inline">Commits</span>
                        </TabsTrigger>
                        <TabsTrigger value="prs" className="gap-2">
                            <GitPullRequest className="h-4 w-4" />
                            <span className="hidden sm:inline">PRs</span>
                        </TabsTrigger>
                        <TabsTrigger value="files" className="gap-2">
                            <FolderTree className="h-4 w-4" />
                            <span className="hidden sm:inline">Files</span>
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="gap-2">
                            <BarChart className="h-4 w-4" />
                            <span className="hidden sm:inline">Analytics</span>
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="gap-2">
                            <StickyNote className="h-4 w-4" />
                            <span className="hidden sm:inline">Notes</span>
                        </TabsTrigger>
                        <TabsTrigger value="teams" className="gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Teams</span>
                        </TabsTrigger>
                        {isOwner && (
                            <TabsTrigger value="admins" className="gap-2">
                                <Shield className="h-4 w-4" />
                                <span className="hidden sm:inline">Admins</span>
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="contributor-analysis" className="gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span className="hidden sm:inline">Contributors</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Timeline Selector - visible when on Analytics or Contributors tab */}
                    {(activeTab === 'analytics' || activeTab === 'contributor-analysis') && (
                        <div className="flex items-center gap-0.5 rounded-md border border-border/50 p-0.5 ml-auto">
                            <button
                                onClick={() => setAnalyticsTimeline(7)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${analyticsTimeline === 7
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground/70 hover:text-muted-foreground'
                                    }`}
                            >
                                7d
                            </button>
                            <button
                                onClick={() => setAnalyticsTimeline(30)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${analyticsTimeline === 30
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground/70 hover:text-muted-foreground'
                                    }`}
                            >
                                30d
                            </button>
                            <button
                                onClick={() => setAnalyticsTimeline(0)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${analyticsTimeline === 0
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground/70 hover:text-muted-foreground'
                                    }`}
                            >
                                All
                            </button>
                        </div>
                    )}
                </div>

                {/* Commits Tab */}
                <TabsContent value="commits" className="mt-6 space-y-4">
                    <h2 className="font-heading text-xl font-semibold">
                        Commits from {selectedBranch} ({commits.length})
                    </h2>
                    {commits.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <GitCommit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-heading text-lg font-semibold mb-2">No commits found</h3>
                                <p className="text-muted-foreground text-sm">
                                    This branch doesn't have any commits yet.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {commits
                                .slice((commitsPage - 1) * itemsPerPage, commitsPage * itemsPerPage)
                                .map((commit: any) => (
                                    <Card key={commit.id} className="hover-lift">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 space-y-2">
                                                    <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                                                        {commit.sha.substring(0, 7)}
                                                    </code>
                                                    <CardTitle className="text-base font-normal">
                                                        {commit.message}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {new Date(commit.committedAt).toLocaleString()}
                                                    </CardDescription>
                                                </div>
                                                <Button
                                                    onClick={() => navigate(`/commit/${commit.id}`)}
                                                    size="sm"
                                                    className="gap-2 ml-4"
                                                >
                                                    View Details
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                        </div>
                    )}
                    {commits.length > 0 && (
                        <Pagination
                            currentPage={commitsPage}
                            totalPages={Math.ceil(commits.length / itemsPerPage)}
                            onPageChange={setCommitsPage}
                        />
                    )}
                </TabsContent>

                {/* Pull Requests Tab */}
                <TabsContent value="prs" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-heading text-xl font-semibold">
                            Pull Requests ({prs.length})
                        </h2>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setPrFilter('all')}
                                variant={prFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                className={prFilter !== 'all' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                            >
                                All
                            </Button>
                            <Button
                                onClick={() => setPrFilter('open')}
                                variant={prFilter === 'open' ? 'default' : 'outline'}
                                size="sm"
                                className={prFilter !== 'open' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                            >
                                Open
                            </Button>
                            <Button
                                onClick={() => setPrFilter('closed')}
                                variant={prFilter === 'closed' ? 'default' : 'outline'}
                                size="sm"
                                className={prFilter !== 'closed' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                            >
                                Closed
                            </Button>
                        </div>
                    </div>

                    {prs.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <GitPullRequest className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-heading text-lg font-semibold mb-2">No Pull Requests Found</h3>
                                <p className="text-muted-foreground text-sm">
                                    {prFilter === 'all'
                                        ? 'No pull requests have been created for this repository yet.'
                                        : `No ${prFilter} pull requests found.`}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {prs
                                .slice((prsPage - 1) * itemsPerPage, prsPage * itemsPerPage)
                                .map((pr: any) => (
                                    <Card key={pr.id} className="hover-lift">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-xs">PR</Badge>
                                                        <CardTitle className="text-base">
                                                            {pr.title || `Pull Request #${pr.prNumber}`}
                                                        </CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs text-muted-foreground">
                                                            #{pr.prNumber}
                                                        </code>
                                                        <Badge variant={
                                                            pr.state === 'open' ? 'success' :
                                                                pr.merged ? 'merged' : 'destructive'
                                                        }>
                                                            {pr.state === 'open' ? 'Open' : pr.merged ? 'Merged' : 'Closed'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => navigate(`/pr/${repository.ownerUsername}/${repository.name}/${pr.prNumber}`)}
                                                    size="sm"
                                                    className="gap-2 ml-4"
                                                >
                                                    View PR
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                        </div>
                    )}
                    {prs.length > 0 && (
                        <Pagination
                            currentPage={prsPage}
                            totalPages={Math.ceil(prs.length / itemsPerPage)}
                            onPageChange={setPrsPage}
                        />
                    )}
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="mt-6 space-y-4">
                    <h2 className="font-heading text-xl font-semibold">
                        File Structure ({selectedBranch} branch)
                    </h2>
                    {files.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-heading text-lg font-semibold mb-2">No files found</h3>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <FileTree
                                    files={files}
                                    onFileClick={(fileId) => navigate(`/file/${fileId}?branch=${encodeURIComponent(selectedBranch)}`)}
                                />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="mt-6 space-y-8">
                    <RepositoryAnalytics repositoryId={repositoryId!} branchName={selectedBranch} timelineDays={analyticsTimeline} onExport={downloadAnalyticsReport} />

                    <div>
                        <h2 className="font-heading text-2xl font-semibold mb-6">Team Insights</h2>
                        <TeamInsights repositoryId={repositoryId!} branchName={selectedBranch} timelineDays={analyticsTimeline} />
                    </div>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-6">
                    <RepositoryNotesTab repositoryId={repositoryId!} />
                </TabsContent>

                {/* Teams Tab */}
                <TabsContent value="teams" className="mt-6">
                    <TeamsTab repositoryId={repositoryId!} />
                </TabsContent>

                {/* Admins Tab (Owner Only) */}
                {isOwner && (
                    <TabsContent value="admins" className="mt-6">
                        <AdminsTab
                            repositoryId={repositoryId!}
                            userId={userId}
                            isOwner={isOwner}
                        />
                    </TabsContent>
                )}

                {/* Contributor Analysis Tab */}
                <TabsContent value="contributor-analysis" className="mt-6">
                    <TeamContributorAnalysis repositoryId={repositoryId!} timelineDays={analyticsTimeline} />
                </TabsContent>
            </Tabs>
        </div >
    );
}
