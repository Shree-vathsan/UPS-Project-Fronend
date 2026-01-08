import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { GitPullRequest, GitBranch, Clock, FileText, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Target, Users, MessageSquare } from 'lucide-react';
import BackButton from '../components/BackButton';
import Pagination from '../components/Pagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { usePullRequestDetails } from '../hooks/useApiQueries';

interface PullRequestViewProps {
    user: any;
}

export default function PullRequestView({ user: _user }: PullRequestViewProps) {
    const { owner, repo, prNumber } = useParams<{ owner: string; repo: string; prNumber: string }>();
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Get token from localStorage for authenticated requests
    const token = localStorage.getItem('token') || undefined;

    // React Query hook for PR details with caching
    const {
        data: prDetails,
        isLoading: loading,
        error: prError
    } = usePullRequestDetails(owner, repo, prNumber ? parseInt(prNumber) : undefined, token);

    const error = prError?.message || '';

    const toggleFile = (filename: string) => {
        const newExpanded = new Set(expandedFiles);
        if (newExpanded.has(filename)) {
            newExpanded.delete(filename);
        } else {
            newExpanded.add(filename);
        }
        setExpandedFiles(newExpanded);
    };

    const getStatusColor = (status: string): 'success' | 'destructive' | 'warning' | 'secondary' => {
        switch (status) {
            case 'added': return 'success';
            case 'removed': return 'destructive';
            case 'modified': return 'warning';
            default: return 'secondary';
        }
    };

    if (loading) {
        return (
            <div className="container-custom py-8 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-custom py-8">
                <BackButton />
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Failed to Load PR Details</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!prDetails) {
        return (
            <div className="container-custom py-8">
                <BackButton />
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="font-heading text-lg font-semibold">PR not found</h3>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container-custom py-8 animate-fade-in">
            <BackButton />

            {/* PR Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <GitPullRequest className="h-8 w-8 text-primary" />
                    <h1 className="font-heading text-3xl font-bold">PR #{prDetails.number}</h1>
                    <Badge variant={
                        prDetails.state === 'open' ? 'success' :
                            prDetails.merged ? 'merged' : 'destructive'
                    }>
                        {prDetails.state === 'open' ? 'Open' : prDetails.merged ? 'Merged' : 'Closed'}
                    </Badge>
                </div>
                <h2 className="text-xl text-muted-foreground">{prDetails.title}</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Author */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <img
                                    src={prDetails.author.avatarUrl}
                                    alt={prDetails.author.login}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div>
                                    <CardTitle className="text-base">{prDetails.author.login}</CardTitle>
                                    <CardDescription>Author</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Branches */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <GitBranch className="h-4 w-4" />
                                Branches
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <code className="px-3 py-1 bg-muted rounded text-primary font-mono text-sm">
                                    {prDetails.headBranch}
                                </code>
                                <span className="text-muted-foreground">→</span>
                                <code className="px-3 py-1 bg-muted rounded text-primary font-mono text-sm">
                                    {prDetails.baseBranch}
                                </code>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Description */}
                    {prDetails.body && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Description
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {prDetails.body}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recommended Reviewers */}
                    {prDetails.recommendedReviewers && prDetails.recommendedReviewers.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    Recommended Reviewers
                                </CardTitle>
                                <CardDescription>
                                    Based on file ownership across all changed files
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {prDetails.recommendedReviewers.map((reviewer: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                                        {reviewer.avatarUrl ? (
                                            <img
                                                src={reviewer.avatarUrl}
                                                alt={reviewer.authorName}
                                                className="w-10 h-10 rounded-full border-2 border-green-500"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                                                {reviewer.authorName?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium mb-1">{reviewer.authorName}</div>
                                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 transition-all duration-300"
                                                    style={{ width: `${reviewer.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                                {Math.round(reviewer.percentage)}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {reviewer.filesContributed} {reviewer.filesContributed === 1 ? 'file' : 'files'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Potential Merge Conflicts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Potential Merge Conflicts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {prDetails.potentialConflicts && prDetails.potentialConflicts.length > 0 ? (
                                <div className="space-y-3">
                                    <Alert variant="destructive">
                                        <AlertDescription>
                                            Found {prDetails.potentialConflicts.length} {prDetails.potentialConflicts.length === 1 ? 'PR' : 'PRs'} with overlapping files
                                        </AlertDescription>
                                    </Alert>
                                    {prDetails.potentialConflicts.map((conflict: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-destructive/10 border border-destructive rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">PR #{conflict.prNumber}</span>
                                                    <Badge variant="destructive">
                                                        {Math.round(conflict.conflictPercentage)}% overlap
                                                    </Badge>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{conflict.title}</p>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium">Overlapping files:</p>
                                                <div className="p-3 bg-background rounded border">
                                                    {conflict.overlappingFiles.map((file: string, fileIdx: number) => (
                                                        <div key={fileIdx} className="font-mono text-xs text-destructive">
                                                            • {file}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600 dark:text-green-400" />
                                    <p className="font-medium text-green-600 dark:text-green-400">
                                        No conflicts detected with other open PRs
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Files Changed */}
                    <div>
                        <h2 className="font-heading text-2xl font-semibold mb-4">
                            Files Changed ({prDetails.filesChanged.length})
                        </h2>
                        <div className="space-y-3">
                            {prDetails.filesChanged
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map((file: any) => (
                                    <Card key={file.filename}>
                                        <CardHeader
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => toggleFile(file.filename)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    {expandedFiles.has(file.filename) ?
                                                        <ChevronDown className="h-4 w-4 flex-shrink-0" /> :
                                                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                                    }
                                                    <code className="text-sm font-mono truncate">{file.filename}</code>
                                                    <Badge variant={getStatusColor(file.status)} className="flex-shrink-0">
                                                        {file.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                    <span className="text-xs text-green-600 dark:text-green-400">+{file.additions}</span>
                                                    <span className="text-xs text-red-600 dark:text-red-400">-{file.deletions}</span>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        {/* Smooth transition for file expansion */}
                                        <div
                                            className={`grid transition-all duration-300 ${expandedFiles.has(file.filename) && file.patch
                                                ? 'grid-rows-[1fr] opacity-100'
                                                : 'grid-rows-[0fr] opacity-0'
                                                }`}
                                        >
                                            <div className="overflow-hidden">
                                                <CardContent className="pt-0">
                                                    <div className="bg-muted/30 rounded-md overflow-hidden border">
                                                        {file.patch?.split('\n').map((line: string, lineIdx: number) => {
                                                            let className = 'px-4 py-0.5 font-mono text-xs';
                                                            if (line.startsWith('+') && !line.startsWith('+++')) {
                                                                className += ' bg-green-500/10 text-green-600 dark:text-green-400 border-l-2 border-green-500';
                                                            } else if (line.startsWith('-') && !line.startsWith('---')) {
                                                                className += ' bg-red-500/10 text-red-600 dark:text-red-400 border-l-2 border-red-500';
                                                            } else if (line.startsWith('@@')) {
                                                                className += ' bg-blue-500/10 text-primary border-l-2 border-primary';
                                                            } else if (line.startsWith('+++') || line.startsWith('---')) {
                                                                className += ' text-muted-foreground';
                                                            }

                                                            return (
                                                                <div key={lineIdx} className={className}>
                                                                    {line || ' '}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(prDetails.filesChanged.length / itemsPerPage)}
                            onPageChange={setCurrentPage}
                        />
                    </div>

                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created:</span>
                                <span className="font-medium">{new Date(prDetails.createdAt).toLocaleDateString()}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Updated:</span>
                                <span className="font-medium">{new Date(prDetails.updatedAt).toLocaleDateString()}</span>
                            </div>
                            {prDetails.mergedAt && (
                                <>
                                    <Separator />
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Merged:</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">
                                            {new Date(prDetails.mergedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Assigned Reviewers */}
                    {prDetails.requestedReviewers && prDetails.requestedReviewers.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Assigned Reviewers
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {prDetails.requestedReviewers.map((reviewer: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <img
                                            src={reviewer.avatarUrl}
                                            alt={reviewer.login}
                                            className="w-8 h-8 rounded-full"
                                        />
                                        <span className="font-medium text-sm">{reviewer.login}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* PR Comments */}
                    {prDetails.comments && prDetails.comments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Comments ({prDetails.comments.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {prDetails.comments.slice(0, 5).map((comment: any, idx: number) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={comment.author.avatarUrl}
                                                alt={comment.author.login}
                                                className="w-6 h-6 rounded-full"
                                            />
                                            <span className="font-medium text-sm">{comment.author.login}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-3 pl-8">
                                            {comment.body}
                                        </p>
                                        {idx < Math.min(prDetails.comments.length - 1, 4) && <Separator />}
                                    </div>
                                ))}
                                {prDetails.comments.length > 5 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        +{prDetails.comments.length - 5} more comments
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* PR Reviews (review comments) */}
                    {prDetails.reviews && prDetails.reviews.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Review Comments ({prDetails.reviews.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {prDetails.reviews.slice(0, 5).map((review: any, idx: number) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={review.author.avatarUrl}
                                                alt={review.author.login}
                                                className="w-6 h-6 rounded-full"
                                            />
                                            <span className="font-medium text-sm">{review.author.login}</span>
                                            <Badge variant={review.state === 'approved' ? 'success' : 'secondary'} className="text-xs">
                                                {review.state}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-3 pl-8">
                                            {review.body}
                                        </p>
                                        {idx < Math.min(prDetails.reviews.length - 1, 4) && <Separator />}
                                    </div>
                                ))}
                                {prDetails.reviews.length > 5 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        +{prDetails.reviews.length - 5} more reviews
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
