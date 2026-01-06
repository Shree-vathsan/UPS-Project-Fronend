import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, BarChart, Plus, Loader, RefreshCw, AlertTriangle, Search, Info, ChevronDown, ChevronUp, Home, Github, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RecentFilesWidget, BookmarksWidget, TeamActivityWidget, QuickStatsWidget, PendingReviewsWidget } from '../components/widgets';
import { api } from '../utils/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '../components/Pagination';
import { useAllRepositories, useAnalyzedRepositories, useInvalidateRepositories } from '../hooks/useApiQueries';
import { useTheme } from '@/components/theme-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DashboardProps {
    user: any;
    token: string;
}

type TabType = 'home' | 'your' | 'analyzed' | 'add';
type FilterType = 'your' | 'others' | 'all';
type RepoFilterType = 'all' | 'public' | 'private' | 'contributor' | 'notanalyzed';

export default function Dashboard({ user, token }: DashboardProps) {
    const navigate = useNavigate();
    const { resolvedTheme } = useTheme();

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('home');

    // React Query hooks for data fetching with caching
    const {
        data: reposData,
        isLoading: loading,
        isFetching: isRefreshingRepos,
        error: reposError,
        refetch: refetchRepos
    } = useAllRepositories(token, user?.id);

    const repos = reposData?.data || [];
    const error = reposError?.message || '';

    // Analyzed repositories filter state
    const [analyzedFilter, setAnalyzedFilter] = useState<FilterType>('all');

    const {
        data: analyzedReposData,
        isLoading: loadingAnalyzed,
        error: analyzedReposError,
        refetch: refetchAnalyzed
    } = useAnalyzedRepositories(user?.id, analyzedFilter);

    const analyzedRepos = Array.isArray(analyzedReposData) ? analyzedReposData : [];
    const analyzedError = analyzedReposError?.message || '';

    // UI state (not data fetching)
    const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
    const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [analyzedSearchQuery, setAnalyzedSearchQuery] = useState('');

    // Pagination state for analyzed repos
    const [analyzedCurrentPage, setAnalyzedCurrentPage] = useState(1);

    // Repository filter state (for Your Repositories tab)
    const [repoFilter, setRepoFilter] = useState<RepoFilterType>('all');

    // Quick guide visibility
    const [showQuickGuide, setShowQuickGuide] = useState(false);

    // Analyze confirmation dialog state
    const [analyzeConfirmRepo, setAnalyzeConfirmRepo] = useState<{ login: string; name: string } | null>(null);

    // Delete confirmation dialog state
    const [deleteConfirmRepo, setDeleteConfirmRepo] = useState<{ id: string; name: string } | null>(null);

    // Add repository tab state
    const [repoUrl, setRepoUrl] = useState('');
    const [addingRepo, setAddingRepo] = useState(false);
    const [addError, setAddError] = useState<string>('');
    const [addSuccess, setAddSuccess] = useState<string>('');

    // Sub-tab state for Add Repository section
    const [addSubTab, setAddSubTab] = useState<'url' | 'find'>('url');

    // Find Repository state
    const [findFilters, setFindFilters] = useState({
        language: 'TypeScript',
        stars: 10,
        forks: 0,
        watchers: 0,
        hasGoodFirstIssues: false,
        pushedAfter: '',
        excludeForks: true,
        excludeArchived: true
    });
    const [findRepositories, setFindRepositories] = useState<any[]>([]);
    const [findLoading, setFindLoading] = useState(false);
    const [findError, setFindError] = useState<string>('');
    const [findResultsPerPage, setFindResultsPerPage] = useState(10);
    const [findSortBy, setFindSortBy] = useState<'stars' | 'forks' | 'updated' | 'watchers'>('stars');
    const [findCurrentPage, setFindCurrentPage] = useState(1);
    const [findItemsPerPage] = useState(10);

    // Cache invalidation helper
    useInvalidateRepositories();

    // State for minimum loading animation duration
    const [isManualRefreshingAnalyzed, setIsManualRefreshingAnalyzed] = useState(false);

    // Wrapper function for backward compatibility
    const loadRepositories = () => {
        refetchRepos();
    };

    const loadAnalyzedRepositories = async () => {
        setIsManualRefreshingAnalyzed(true);
        const minDelay = new Promise(resolve => setTimeout(resolve, 1000)); // Minimum 1 second
        await Promise.all([refetchAnalyzed(), minDelay]);
        setIsManualRefreshingAnalyzed(false);
    };

    const handleAnalyze = async (owner: string, name: string) => {
        const key = `${owner}/${name}`;
        setAnalyzing(prev => new Set(prev).add(key));

        try {
            const result = await api.analyzeRepository(owner, name, user.id, token);
            console.log('Analysis result:', result);

            // Handle different response types
            if (result.alreadyHasAccess) {
                // User already has access
                toast.info('Repository Access', { description: 'You already have access to this repository!' });
                setActiveTab('analyzed');
                await loadAnalyzedRepositories();
            } else if (result.accessGranted) {
                // Repository was analyzed by someone else, access granted
                const message = result.message || `Repository was analyzed by${result.analyzedBy ? ' ' + result.analyzedBy : ' another user'}. Access granted!`;
                toast.success('Access Granted', { description: `${message} You can now view this repository in the "Analyzed Repository" tab.` });
                setActiveTab('analyzed');
                await loadAnalyzedRepositories();
            } else if (result.newAnalysis) {
                // New analysis started
                toast.success('Analysis Started', { description: `Analysis started for ${owner}/${name}! This will take a few minutes. Check the "Analyzed Repository" tab to see the status.` });
                await loadRepositories();
            } else {
                // Fallback for any other response
                toast.success('Analysis Started', { description: `Analysis started for ${owner}/${name}!` });
            }
        } catch (error: any) {
            console.error('Analysis failed:', error);
            toast.error('Failed to Analyze', { description: `Failed to analyze ${owner}/${name}: ${error.message}` });
        } finally {
            setAnalyzing(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    const handleViewAnalysis = async (owner: string, name: string) => {
        const key = `${owner}/${name}`;
        setCheckingStatus(prev => new Set(prev).add(key));

        try {
            const status = await api.getRepositoryStatus(owner, name);
            console.log('Repository status:', status);

            if (!status.analyzed) {
                toast.warning('Repository Not Analyzed', { description: 'This repository has not been analyzed yet. Click "Analyze" first!' });
                return;
            }

            if (status.status === 'ready') {
                toast.info('Opening Repository', { description: 'Fetching latest code and opening repository...' });
                navigate(`/repo/${status.repositoryId}`);
            } else if (status.status === 'analyzing') {
                toast.info('Analysis in Progress', { description: 'Analysis is still in progress. Please wait a few minutes and try again.' });
            } else if (status.status === 'pending') {
                toast.info('Analysis Queued', { description: 'Analysis is queued and will start soon.' });
            } else {
                toast.info('Repository Status', { description: `Current status: ${status.status}` });
            }
        } catch (error: any) {
            console.error('Failed to check status:', error);
            toast.error('Status Check Failed', { description: error.message });
        } finally {
            setCheckingStatus(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    const handleDeleteRepository = async (repoId: string, repoName: string) => {
        try {
            await api.deleteRepository(repoId);
            toast.success('Repository Deleted', { description: `Analysis for ${repoName} has been deleted.` });
            setDeleteConfirmRepo(null);
            await loadAnalyzedRepositories();
            // Also refresh the "Your Repositories" list as the status changes back to not analyzed
            loadRepositories();
        } catch (error: any) {
            console.error('Failed to delete repository:', error);
            toast.error('Delete Failed', { description: error.message });
        }
    };

    const handleAddRepository = async () => {
        if (!repoUrl.trim()) {
            setAddError('Please enter a GitHub repository URL');
            return;
        }

        setAddingRepo(true);
        setAddError('');
        setAddSuccess('');

        try {
            const result = await api.analyzeRepositoryByUrl(repoUrl.trim(), user.id, token);

            // Handle different response types
            if (result.alreadyHasAccess) {
                // User already has access
                toast.info('Repository Access', { description: 'You already have access to this repository! Navigating to the "Analyzed Repository" tab.' });
                setActiveTab('analyzed');
                setRepoUrl('');
            } else if (result.accessGranted) {
                // Repository was analyzed by someone else, access granted
                const timeAgoText = result.analyzedBy ? ` by ${result.analyzedBy}` : '';
                toast.success('Access Granted', { description: `Repository was already analyzed${timeAgoText}. Access granted! Navigating to the "Analyzed Repository" tab.` });
                setActiveTab('analyzed');
                setRepoUrl('');
            } else if (result.newAnalysis) {
                // New analysis started
                setAddSuccess(`Successfully started analysis for the repository!\n\nAnalysis will take a few minutes. Switch to the "Analyzed Repository" tab to see the progress.`);
                setRepoUrl('');
                // Refresh analyzed repos
                if (activeTab !== 'analyzed') {
                    setTimeout(() => setActiveTab('analyzed'), 2000);
                }
            } else if (result.alreadyExists) {
                // Legacy handling for old backend responses
                if (result.status === 'ready') {
                    toast.info('Repository Already Analyzed', { description: 'This repository has already been analyzed. You can view it in the "Analyzed Repository" tab.' });
                    setActiveTab('analyzed');
                } else {
                    toast.info('Analysis in Progress', { description: 'This repository is already being analyzed. Check the "Analyzed Repository" tab for status updates.' });
                    setActiveTab('analyzed');
                }
            } else {
                // Fallback
                setAddSuccess(`Successfully started analysis for the repository!`);
                setRepoUrl('');
            }
        } catch (error: any) {
            console.error('Failed to add repository:', error);
            setAddError(error.message || 'Failed to add repository');
        } finally {
            setAddingRepo(false);
        }
    };

    // GitHub Repository Search Handler
    const buildGitHubQuery = useCallback(() => {
        const parts: string[] = [];

        if (findFilters.language) {
            parts.push(`language:${findFilters.language}`);
        }
        if (findFilters.stars > 0) {
            parts.push(`stars:>${findFilters.stars}`);
        }
        if (findFilters.forks > 0) {
            parts.push(`forks:>${findFilters.forks}`);
        }
        if (findFilters.watchers > 0) {
            parts.push(`watchers:>${findFilters.watchers}`);
        }
        if (findFilters.hasGoodFirstIssues) {
            parts.push(`good-first-issues:>0`);
        }
        if (findFilters.pushedAfter && findFilters.pushedAfter.trim()) {
            parts.push(`pushed:>${findFilters.pushedAfter}`);
        }
        if (findFilters.excludeForks) {
            parts.push(`fork:false`);
        }
        if (findFilters.excludeArchived) {
            parts.push(`archived:false`);
        }

        return parts.join(' ');
    }, [findFilters]);

    const handleSearchRepositories = async () => {
        setFindLoading(true);
        setFindError('');
        setFindCurrentPage(1); // Reset to first page on new search
        try {
            const query = buildGitHubQuery();
            const githubToken = token; // Use the token from props (localStorage)
            const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${findResultsPerPage}&sort=stars&order=desc`;

            // DEBUG: Log the query and URL
            console.log('🔍 Search Query:', query);
            console.log('🔗 Full URL:', url);
            console.log('🔑 Has Token:', !!githubToken);

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    ...(githubToken && { 'Authorization': `Bearer ${githubToken}` })
                }
            });

            console.log('📡 Response Status:', response.status);

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('GitHub API rate limit exceeded. Please try again later.');
                }
                throw new Error(`GitHub API error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Response Data:', data);
            console.log('📦 Items Count:', data.items?.length || 0);
            console.log('🔢 Total Count:', data.total_count);

            setFindRepositories(data.items || []);
        } catch (error: any) {
            console.error('❌ Failed to search repositories:', error);
            setFindError(error.message || 'Failed to search repositories');
        } finally {
            setFindLoading(false);
        }
    };

    const getSortedRepositories = () => {
        const sorted = [...findRepositories];

        let sortedArray;
        switch (findSortBy) {
            case 'stars':
                sortedArray = sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
                break;
            case 'forks':
                sortedArray = sorted.sort((a, b) => b.forks_count - a.forks_count);
                break;
            case 'watchers':
                sortedArray = sorted.sort((a, b) => b.watchers_count - a.watchers_count);
                break;
            case 'updated':
                sortedArray = sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                break;
            default:
                sortedArray = sorted;
        }

        // Paginate the sorted results
        const startIndex = (findCurrentPage - 1) * findItemsPerPage;
        const endIndex = startIndex + findItemsPerPage;
        return sortedArray.slice(startIndex, endIndex);
    };

    return (
        <div className="container-custom py-8 animate-fade-in">
            <div className="mb-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="font-heading text-3xl font-bold mb-2">Repository Management</h1>
                        <p className="text-muted-foreground">
                            Analyze repositories, track progress, and view insights
                        </p>
                    </div>

                    {/* Quick Tips Toggle */}
                    <Button
                        onClick={() => setShowQuickGuide(!showQuickGuide)}
                        variant="default"
                        size="sm"
                        className="gap-2"
                    >
                        <Info className="h-4 w-4" />
                        <span>Quick Tips</span>
                        {showQuickGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Collapsible Quick Guide - with smooth transition */}
                <div
                    className={`grid transition-all duration-300 ${showQuickGuide
                        ? 'grid-rows-[1fr] opacity-100 mt-4'
                        : 'grid-rows-[0fr] opacity-0 mt-0'
                        }`}
                >
                    <Card className="max-w-4xl overflow-hidden">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-primary text-xl font-bold">•</span>
                                    <span className="text-base">Repositories are fetched from your GitHub account</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-primary text-xl font-bold">•</span>
                                    <span className="text-base">Click "Analyze" to start repository analysis</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-primary text-xl font-bold">•</span>
                                    <span className="text-base">Analysis includes Git history & semantic embeddings</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-primary text-xl font-bold">•</span>
                                    <span className="text-base">View detailed insights when analysis is ready</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
                <TabsList className="grid w-full max-w-2xl grid-cols-4">
                    <TabsTrigger value="home" className="gap-2">
                        <Home className="h-4 w-4" />
                        <span className="hidden sm:inline">Home</span>
                    </TabsTrigger>
                    <TabsTrigger value="your" className="gap-2">
                        <Package className="h-4 w-4" />
                        <span className="hidden sm:inline">Your Repositories</span>
                        <span className="sm:hidden">Your</span>
                    </TabsTrigger>
                    <TabsTrigger value="analyzed" className="gap-2" loading={loadingAnalyzed}>
                        <BarChart className="h-4 w-4" />
                        <span className="hidden sm:inline">Analyzed</span>
                        <span className="sm:hidden">Analyzed</span>
                    </TabsTrigger>
                    <TabsTrigger value="add" className="gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Repository</span>
                        <span className="sm:hidden">Add</span>
                    </TabsTrigger>
                </TabsList>

                {/* Home Tab - Personalized Dashboard */}
                <TabsContent value="home" className="mt-6 space-y-6">
                    {/* Quick Stats - Full Width at Top */}
                    <QuickStatsWidget userId={user?.id} />

                    {/* Widget Row: Recent Files, Bookmarks, Pending Reviews */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                        {/* Recent Files */}
                        <RecentFilesWidget userId={user?.id} />

                        {/* Bookmarks */}
                        <BookmarksWidget userId={user?.id} />

                        {/* Pending Reviews */}
                        <PendingReviewsWidget userId={user?.id} />
                    </div>

                    {/* Team Activity - Full Width at Bottom */}
                    <TeamActivityWidget userId={user?.id} />
                </TabsContent>

                {/* Your Repositories Tab */}
                <TabsContent value="your" className="mt-6 space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-full mt-2" />
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    ) : error ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error Loading Repositories</AlertTitle>
                            <AlertDescription>
                                {error}
                                <div className="mt-4">
                                    <Button onClick={loadRepositories} variant="outline" size="sm" disabled={isRefreshingRepos} className={resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}>
                                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingRepos ? 'animate-spin' : ''}`} />
                                        {isRefreshingRepos ? 'Retrying...' : 'Try Again'}
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    ) : repos.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-heading text-lg font-semibold mb-2">No repositories found</h3>
                                <p className="text-muted-foreground text-sm">
                                    Create a repository on GitHub to get started!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-heading text-xl font-semibold">Your Repositories</h2>
                                    <Badge>{repos.length}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search repositories..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setCurrentPage(1); // Reset to first page on search
                                            }}
                                            className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] w-[200px]"
                                        />
                                    </div>
                                    <Button onClick={loadRepositories} variant="outline" size="sm" disabled={isRefreshingRepos} className={resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}>
                                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingRepos ? 'animate-spin' : ''}`} />
                                        {isRefreshingRepos ? 'Refreshing...' : 'Refresh'}
                                    </Button>
                                </div>
                            </div>

                            {/* Repository Type Filter */}
                            <div className="flex gap-2 mb-4">
                                <Button
                                    onClick={() => setRepoFilter('all')}
                                    variant={repoFilter === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    className={repoFilter !== 'all' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                                >
                                    All ({repos.length})
                                </Button>
                                <Button
                                    onClick={() => setRepoFilter('public')}
                                    variant={repoFilter === 'public' ? 'default' : 'outline'}
                                    size="sm"
                                    className={repoFilter !== 'public' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                                >
                                    Public ({repos.filter((r: any) => r.private === false).length})
                                </Button>
                                <Button
                                    onClick={() => setRepoFilter('private')}
                                    variant={repoFilter === 'private' ? 'default' : 'outline'}
                                    size="sm"
                                    className={repoFilter !== 'private' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                                >
                                    Private ({repos.filter((r: any) => r.private === true).length})
                                </Button>
                                <Button
                                    onClick={() => setRepoFilter('contributor')}
                                    variant={repoFilter === 'contributor' ? 'default' : 'outline'}
                                    size="sm"
                                    className={repoFilter !== 'contributor' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                                >
                                    Contributor ({repos.filter((r: any) => {
                                        const perms = r.permissions;
                                        return perms && perms.admin === false && perms.push === true;
                                    }).length})
                                </Button>
                                <Button
                                    onClick={() => setRepoFilter('notanalyzed')}
                                    variant={repoFilter === 'notanalyzed' ? 'default' : 'outline'}
                                    size="sm"
                                    className={repoFilter !== 'notanalyzed' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                                >
                                    Not Analyzed ({repos.filter((r: any) => r.analyzed !== true).length})
                                </Button>
                            </div>

                            {/* Collapsible Quick Guide */}
                            {/* <button
                                onClick={() => setShowQuickGuide(!showQuickGuide)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                            >
                                {showQuickGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <Info className="h-3 w-3" />
                                <span>Quick Tips</span>
                            </button> */}

                            {/* {showQuickGuide && (
                                <div className="bg-muted/50 border rounded-lg p-3 mb-4 text-xs text-muted-foreground">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>• Repos fetched from your GitHub account</div>
                                        <div>• Click "Analyze" to start analysis</div>
                                        <div>• Includes Git history & semantic embeddings</div>
                                        <div>• View detailed insights when ready</div>
                                    </div>
                                </div>
                            )} */}

                            <div className="grid gap-4">
                                {repos
                                    .filter((repo: any) => {
                                        // Filter by repository type
                                        if (repoFilter === 'public' && repo.private === true) return false;
                                        if (repoFilter === 'private' && repo.private === false) return false;
                                        if (repoFilter === 'contributor') {
                                            // Contributor: has push access but is not admin/owner
                                            const perms = repo.permissions;
                                            if (!perms || perms.admin === true || perms.push !== true) return false;
                                        }
                                        if (repoFilter === 'notanalyzed' && repo.analyzed === true) return false;

                                        // Filter by search query
                                        if (!searchQuery.trim()) return true;
                                        const query = searchQuery.toLowerCase();
                                        const repoName = `${repo.login}/${repo.name}`.toLowerCase();
                                        const description = (repo.description || '').toLowerCase();
                                        return repoName.includes(query) || description.includes(query);
                                    })
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((repo: any) => {
                                        const key = `${repo.login}/${repo.name}`;
                                        const isAnalyzing = analyzing.has(key);
                                        const isCheckingStatus = checkingStatus.has(key);
                                        const isAnalyzed = repo.analyzed === true;
                                        const status = repo.status;

                                        return (
                                            <Card key={repo.id} className="hover-lift">
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div className="space-y-1 flex-1">
                                                            <CardTitle className="text-lg flex items-center gap-2">
                                                                {repo.login}/{repo.name}
                                                                <TooltipProvider delayDuration={200}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <a
                                                                                href={`https://github.com/${repo.login}/${repo.name}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-muted-foreground hover:text-primary transition-colors"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <Github className="h-4 w-4" />
                                                                            </a>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="bottom">
                                                                            Open on GitHub
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </CardTitle>
                                                            <CardDescription>
                                                                {repo.description || 'No description'}
                                                            </CardDescription>
                                                            {isAnalyzed && (
                                                                <div className="mt-2">
                                                                    {status === 'ready' && (
                                                                        <Badge variant="success">Analysis Complete</Badge>
                                                                    )}
                                                                    {status === 'analyzing' && (
                                                                        <Badge variant="warning">Analyzing...</Badge>
                                                                    )}
                                                                    {status === 'pending' && (
                                                                        <Badge variant="info">Pending</Badge>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4 flex items-center gap-2">
                                                            {isAnalyzed && (
                                                                <button
                                                                    className="text-white hover:text-destructive transition-colors cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeleteConfirmRepo({ id: repo.analyzedRepositoryId, name: `${repo.login}/${repo.name}` });
                                                                    }}
                                                                    title="Delete Analysis"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            {isAnalyzing ? (
                                                                <Button disabled size="sm">
                                                                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                                                                    Starting...
                                                                </Button>
                                                            ) : !isAnalyzed ? (
                                                                <Button onClick={() => setAnalyzeConfirmRepo({ login: repo.login, name: repo.name })} size="sm">
                                                                    Analyze
                                                                </Button>
                                                            ) : isCheckingStatus ? (
                                                                <Button disabled variant="outline" size="sm">
                                                                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                                                                    Checking...
                                                                </Button>
                                                            ) : status === 'ready' ? (
                                                                <Button onClick={() => handleViewAnalysis(repo.login, repo.name)} size="sm">
                                                                    View Analysis
                                                                </Button>
                                                            ) : (
                                                                <Button onClick={() => handleViewAnalysis(repo.login, repo.name)} variant="outline" size="sm" className={resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}>
                                                                    Check Status
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        );
                                    })}
                            </div>

                            {(() => {
                                const filteredRepos = repos.filter((repo: any) => {
                                    // Filter by repository type
                                    if (repoFilter === 'public' && repo.private === true) return false;
                                    if (repoFilter === 'private' && repo.private === false) return false;
                                    if (repoFilter === 'contributor') {
                                        // Contributor: has push access but is not admin/owner
                                        const perms = repo.permissions;
                                        if (!perms || perms.admin === true || perms.push !== true) return false;
                                    }

                                    // Filter by search query
                                    if (!searchQuery.trim()) return true;
                                    const query = searchQuery.toLowerCase();
                                    const repoName = `${repo.login}/${repo.name}`.toLowerCase();
                                    const description = (repo.description || '').toLowerCase();
                                    return repoName.includes(query) || description.includes(query);
                                });
                                return filteredRepos.length > 0 ? (
                                    <Pagination
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        totalPages={Math.ceil(filteredRepos.length / itemsPerPage)}
                                        disabled={loading}
                                    />
                                ) : null;
                            })()}


                        </>
                    )}
                </TabsContent>

                {/* Analyzed Repositories Tab */}
                <TabsContent value="analyzed" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="font-heading text-xl font-semibold">Analyzed Repositories</h2>
                            <Badge>{analyzedRepos.length}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search repositories..."
                                    value={analyzedSearchQuery}
                                    onChange={(e) => {
                                        setAnalyzedSearchQuery(e.target.value);
                                        setAnalyzedCurrentPage(1); // Reset to first page on search
                                    }}
                                    className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] w-[200px]"
                                />
                            </div>
                            <Button onClick={loadAnalyzedRepositories} variant="outline" size="sm" disabled={isManualRefreshingAnalyzed} className={resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${isManualRefreshingAnalyzed ? 'animate-spin' : ''}`} />
                                {isManualRefreshingAnalyzed ? 'Refreshing...' : 'Refresh'}
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Button
                            onClick={() => setAnalyzedFilter('all')}
                            variant={analyzedFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            className={analyzedFilter !== 'all' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                        >
                            All
                        </Button>
                        <Button
                            onClick={() => setAnalyzedFilter('your')}
                            variant={analyzedFilter === 'your' ? 'default' : 'outline'}
                            size="sm"
                            className={analyzedFilter !== 'your' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                        >
                            Your
                        </Button>
                        <Button
                            onClick={() => setAnalyzedFilter('others')}
                            variant={analyzedFilter === 'others' ? 'default' : 'outline'}
                            size="sm"
                            className={analyzedFilter !== 'others' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}
                        >
                            Others
                        </Button>
                    </div>

                    {loadingAnalyzed ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2 mt-2" />
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    ) : analyzedError ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{analyzedError}</AlertDescription>
                        </Alert>
                    ) : analyzedRepos.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <BarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-heading text-lg font-semibold mb-2">No Analyzed Repositories</h3>
                                <p className="text-muted-foreground text-sm mb-4">
                                    {analyzedFilter === 'your'
                                        ? "You haven't analyzed any repositories yet."
                                        : analyzedFilter === 'others'
                                            ? 'No repositories from other users have been added.'
                                            : 'No repositories have been analyzed yet.'}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {analyzedFilter === 'your'
                                        ? 'Go to "Your Repository" tab and click "Analyze" on a repository.'
                                        : 'Go to "Add Repository" tab to add a repository from another user.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (() => {
                        // Sort by analyzedAt (most recent first) then filter by search query
                        const filteredAnalyzedRepos = [...analyzedRepos]
                            .sort((a: any, b: any) => {
                                const dateA = a.analyzedAt ? new Date(a.analyzedAt).getTime() : 0;
                                const dateB = b.analyzedAt ? new Date(b.analyzedAt).getTime() : 0;
                                return dateB - dateA; // Most recent first
                            })
                            .filter((repo: any) => {
                                if (!analyzedSearchQuery.trim()) return true;
                                const query = analyzedSearchQuery.toLowerCase();
                                const repoName = `${repo.ownerUsername}/${repo.name}`.toLowerCase();
                                return repoName.includes(query);
                            });

                        // Paginate filtered results
                        const paginatedRepos = filteredAnalyzedRepos.slice(
                            (analyzedCurrentPage - 1) * itemsPerPage,
                            analyzedCurrentPage * itemsPerPage
                        );

                        return (
                            <>
                                <div className="grid gap-4">
                                    {paginatedRepos.map((repo: any) => (
                                        <Card key={repo.id} className="hover-lift">
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-2 flex-1">
                                                        <CardTitle className="text-lg flex items-center gap-2">
                                                            {repo.ownerUsername}/{repo.name}
                                                            <TooltipProvider delayDuration={200}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <a
                                                                            href={`https://github.com/${repo.ownerUsername}/${repo.name}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-muted-foreground hover:text-primary transition-colors"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <Github className="h-4 w-4" />
                                                                        </a>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="bottom">
                                                                        Open on GitHub
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </CardTitle>
                                                        <div className="flex gap-2">
                                                            <Badge variant={repo.isMine ? 'success' : 'info'}>
                                                                {repo.label}
                                                            </Badge>
                                                            <Badge variant={
                                                                repo.status === 'ready' ? 'success' :
                                                                    repo.status === 'analyzing' ? 'warning' : 'secondary'
                                                            }>
                                                                {repo.status === 'ready' ? 'Ready' :
                                                                    repo.status === 'analyzing' ? 'Analyzing' : repo.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <button
                                                            className="text-white hover:text-destructive transition-colors cursor-pointer"
                                                            onClick={() => setDeleteConfirmRepo({ id: repo.id, name: `${repo.ownerUsername}/${repo.name}` })}
                                                            title="Delete Analysis"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                        <Button
                                                            onClick={() => {
                                                                if (repo.status === 'ready') {
                                                                    navigate(`/repo/${repo.id}`);
                                                                } else if (repo.status === 'analyzing') {
                                                                    toast.info('Analysis in Progress', { description: 'This repository is still being analyzed. Please check back in a few minutes.' });
                                                                } else {
                                                                    toast.info('Repository Status', { description: `Current status: ${repo.status}` });
                                                                }
                                                            }}
                                                            disabled={repo.status !== 'ready'}
                                                            size="sm"
                                                        >
                                                            {repo.status === 'ready' ? 'View Details' :
                                                                repo.status === 'analyzing' ? 'Analyzing...' : 'Pending'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div >
                                {
                                    filteredAnalyzedRepos.length > 0 && (
                                        <Pagination
                                            currentPage={analyzedCurrentPage}
                                            onPageChange={setAnalyzedCurrentPage}
                                            totalPages={Math.ceil(filteredAnalyzedRepos.length / itemsPerPage)}
                                            disabled={loadingAnalyzed}
                                        />
                                    )
                                }
                            </>
                        );
                    })()}
                </TabsContent>

                {/* Add Repository Tab */}
                <TabsContent value="add" className="mt-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Sub-tab switcher */}
                        <div className="flex gap-2 mb-6 max-w-md mx-auto">
                            <Button
                                onClick={() => setAddSubTab('url')}
                                variant={addSubTab === 'url' ? 'default' : 'outline'}
                                className={`flex-1 ${addSubTab !== 'url' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}`}
                            >
                                Add by URL
                            </Button>
                            <Button
                                onClick={() => setAddSubTab('find')}
                                variant={addSubTab === 'find' ? 'default' : 'outline'}
                                className={`flex-1 ${addSubTab !== 'find' && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '') || ''}`}
                            >
                                <Search className="h-4 w-4 mr-2" />
                                Find Repository
                            </Button>
                        </div>

                        {/* Add by URL Section */}
                        {addSubTab === 'url' && (
                            <div className="max-w-2xl mx-auto">
                                <Card>
                                    <CardHeader className="text-center">
                                        <Plus className="h-12 w-12 mx-auto mb-4 text-primary" />
                                        <CardTitle>Add Repository to Analyze</CardTitle>
                                        <CardDescription>
                                            Add any public GitHub repository to analyze, even if the owner hasn't logged in to this platform.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                GitHub Repository URL
                                            </label>
                                            <Input
                                                value={repoUrl}
                                                onChange={(e) => setRepoUrl(e.target.value)}
                                                placeholder="https://github.com/owner/repo"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !addingRepo) {
                                                        handleAddRepository();
                                                    }
                                                }}
                                            />
                                        </div>

                                        <Button
                                            onClick={handleAddRepository}
                                            disabled={addingRepo || !repoUrl.trim()}
                                            className="w-full"
                                            size="lg"
                                        >
                                            {addingRepo ? (
                                                <>
                                                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                'Analyze Repository'
                                            )}
                                        </Button>

                                        {addError && (
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>{addError}</AlertDescription>
                                            </Alert>
                                        )}

                                        {addSuccess && (
                                            <Alert variant="success">
                                                <AlertTitle>Success</AlertTitle>
                                                <AlertDescription>{addSuccess}</AlertDescription>
                                            </Alert>
                                        )}

                                        <Alert className="border-foreground/30 text-foreground [&>svg]:text-foreground">
                                            <AlertTitle className="text-foreground">Supported URL Formats:</AlertTitle>
                                            <AlertDescription className="text-foreground/80">
                                                <ul className="text-xs space-y-1 list-disc list-inside mt-2">
                                                    <li><code className="text-foreground">https://github.com/owner/repo</code></li>
                                                    <li><code className="text-foreground">https://github.com/owner/repo.git</code></li>
                                                    <li><code className="text-foreground">github.com/owner/repo</code></li>
                                                    <li><code className="text-foreground">owner/repo</code></li>
                                                </ul>
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Find Repository Section */}
                        {addSubTab === 'find' && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Search GitHub Repositories</CardTitle>
                                        <CardDescription>
                                            Find repositories using filters and add them for analysis
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Filters */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Language */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Programming Language</label>
                                                <select
                                                    value={findFilters.language}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, language: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground"
                                                >
                                                    <option value="">All Languages</option>
                                                    <option value="TypeScript">TypeScript</option>
                                                    <option value="JavaScript">JavaScript</option>
                                                    <option value="Python">Python</option>
                                                    <option value="Java">Java</option>
                                                    <option value="Go">Go</option>
                                                    <option value="Rust">Rust</option>
                                                    <option value="C++">C++</option>
                                                    <option value="C#">C#</option>
                                                    <option value="Ruby">Ruby</option>
                                                    <option value="PHP">PHP</option>
                                                </select>
                                            </div>

                                            {/* Stars */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Minimum Stars</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={findFilters.stars}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, stars: parseInt(e.target.value) || 0 }))}
                                                    placeholder="e.g., 200"
                                                />
                                            </div>

                                            {/* Forks */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Minimum Forks</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={findFilters.forks}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, forks: parseInt(e.target.value) || 0 }))}
                                                    placeholder="e.g., 30"
                                                />
                                            </div>

                                            {/* Watchers */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Minimum Watchers</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={findFilters.watchers}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, watchers: parseInt(e.target.value) || 0 }))}
                                                    placeholder="e.g., 20"
                                                />
                                            </div>

                                            {/* Last Updated */}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Last Updated After</label>
                                                <Input
                                                    type="date"
                                                    value={findFilters.pushedAfter}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, pushedAfter: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Checkboxes */}
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={findFilters.hasGoodFirstIssues}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, hasGoodFirstIssues: e.target.checked }))}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">Has Good First Issues (Contribution Friendly)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={findFilters.excludeForks}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, excludeForks: e.target.checked }))}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">Exclude Forks</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={findFilters.excludeArchived}
                                                    onChange={(e) => setFindFilters(prev => ({ ...prev, excludeArchived: e.target.checked }))}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">Exclude Archived</span>
                                            </label>
                                        </div>

                                        {/* Results per fetch & Sort */}
                                        <div className="flex gap-4 items-end">
                                            <div className="flex-1">
                                                <label className="text-sm font-medium mb-2 block">Results per Fetch</label>
                                                <select
                                                    value={findResultsPerPage}
                                                    onChange={(e) => setFindResultsPerPage(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground"
                                                >
                                                    <option value="10">10</option>
                                                    <option value="20">20</option>
                                                    <option value="30">30</option>
                                                    <option value="40">40</option>
                                                    <option value="50">50</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-sm font-medium mb-2 block">Sort By</label>
                                                <select
                                                    value={findSortBy}
                                                    onChange={(e) => setFindSortBy(e.target.value as any)}
                                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground"
                                                >
                                                    <option value="stars">Stars (High → Low)</option>
                                                    <option value="forks">Forks (High → Low)</option>
                                                    <option value="updated">Recently Updated</option>
                                                    <option value="watchers">Watchers (High → Low)</option>
                                                </select>
                                            </div>
                                            <Button onClick={handleSearchRepositories} disabled={findLoading} size="lg">
                                                {findLoading ? (
                                                    <>
                                                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                                                        Searching...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Search className="h-4 w-4 mr-2" />
                                                        Search
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        {/* Error Display */}
                                        {findError && (
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>{findError}</AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Results */}
                                {findRepositories.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-heading text-xl font-semibold">
                                                Found {findRepositories.length} repositories
                                            </h3>
                                        </div>

                                        <div className="grid gap-4">
                                            {getSortedRepositories().map((repo: any) => (
                                                <Card key={repo.id} className="hover-lift cursor-pointer" onClick={() => window.open(repo.html_url, '_blank')}>
                                                    <CardHeader>
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 space-y-2">
                                                                <CardTitle className="text-lg">
                                                                    {repo.full_name}
                                                                </CardTitle>
                                                                <CardDescription>
                                                                    {repo.description || 'No description'}
                                                                </CardDescription>
                                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                                    {repo.language && (
                                                                        <div className="flex items-center gap-1">
                                                                            <div className="w-3 h-3 rounded-full bg-primary"></div>
                                                                            <span>{repo.language}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-1">
                                                                        ⭐ {repo.stargazers_count.toLocaleString()}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        🍴 {repo.forks_count.toLocaleString()}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        👁️ {repo.watchers_count.toLocaleString()}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-medium">Open Issues:</span> {repo.open_issues_count.toLocaleString()}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        🕒 Updated {formatDistanceToNow(new Date(repo.updated_at))} ago
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {findRepositories.length > findItemsPerPage && (
                                            <Pagination
                                                currentPage={findCurrentPage}
                                                onPageChange={setFindCurrentPage}
                                                totalPages={Math.ceil(findRepositories.length / findItemsPerPage)}
                                                disabled={findLoading}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Empty State */}
                                {!findLoading && findRepositories.length === 0 && !findError && (
                                    <Card>
                                        <CardContent className="py-12 text-center">
                                            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                            <h3 className="font-heading text-lg font-semibold mb-2">No repositories found</h3>
                                            <p className="text-muted-foreground text-sm">
                                                Adjust your filters and click Search to find repositories
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Analyze Confirmation Dialog */}
            <AlertDialog open={!!analyzeConfirmRepo} onOpenChange={(open) => !open && setAnalyzeConfirmRepo(null)}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Start Repository Analysis</AlertDialogTitle>
                        <AlertDialogDescription>
                            Analysis may take some time depending on the repository size. This process will analyze the repository structure, code, and generate insights.
                            <br /><br />
                            Do you want to proceed with the analysis?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={`${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (analyzeConfirmRepo) {
                                    handleAnalyze(analyzeConfirmRepo.login, analyzeConfirmRepo.name);
                                    setAnalyzeConfirmRepo(null);
                                }
                            }}
                        >
                            Start Analysis
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmRepo} onOpenChange={(open) => !open && setDeleteConfirmRepo(null)}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the analysis{deleteConfirmRepo && ` for ${deleteConfirmRepo.name}`}?
                            <br /><br />
                            This will remove the repository from your analyzed list and delete all associated data (commits, file analysis, chat history).
                            <br /><br />
                            <span className="font-bold text-destructive">This action cannot be undone.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={`${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={() => {
                                if (deleteConfirmRepo) {
                                    handleDeleteRepository(deleteConfirmRepo.id, deleteConfirmRepo.name);
                                }
                            }}
                        >
                            Delete Analysis
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
