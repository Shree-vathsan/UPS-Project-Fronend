import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { GitCommit, User, Clock, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import BackButton from '../components/BackButton';
import Pagination from '../components/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useCommit, useCommitGithubDetails } from '../hooks/useApiQueries';

export default function CommitView() {
    const { commitId } = useParams<{ commitId: string }>();
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // React Query hooks for commit data with caching
    const { data: commitData, isLoading: commitLoading, error: commitError } = useCommit(commitId);
    const { data: githubDetails } = useCommitGithubDetails(commitId);

    // Merge commit data with github details
    const commit = commitData ? { ...commitData, github: githubDetails } : null;
    const loading = commitLoading;
    const error = commitError?.message || '';

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
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!commit) {
        return (
            <div className="container-custom py-8">
                <BackButton />
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="font-heading text-lg font-semibold">Commit not found</h3>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container-custom py-8 animate-fade-in">
            <BackButton />

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <GitCommit className="h-8 w-8 text-primary" />
                    <code className="text-2xl font-mono text-primary bg-primary/10 px-4 py-2 rounded">
                        {commit.sha ? commit.sha.substring(0, 7) : 'Unknown'}
                    </code>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {commit.committedAt && new Date(commit.committedAt).toLocaleString()}
                    </div>
                </div>

                <h1 className="text-2xl font-heading font-bold mb-4">
                    {commit.message || 'No message'}
                </h1>

                {commit.github && (
                    <div className="flex gap-4 text-sm">
                        <span className="text-green-600 dark:text-green-400">
                            +{commit.github.stats?.additions || 0} additions
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                            -{commit.github.stats?.deletions || 0} deletions
                        </span>
                        <span className="text-muted-foreground">
                            {commit.github.files?.length || 0} files changed
                        </span>
                    </div>
                )}
            </div>

            {/* Commit Information */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Commit Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">SHA:</span>
                        <code className="text-primary font-mono">{commit.sha}</code>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Message:</span>
                        <span className="text-right flex-1 ml-4">{commit.message}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Author:
                        </span>
                        <span>{commit.github?.commit?.author?.name || 'Unknown'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Date:
                        </span>
                        <span>{commit.committedAt && new Date(commit.committedAt).toLocaleString()}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Files Changed */}
            {commit.github?.files && (
                <div>
                    <h2 className="font-heading text-2xl font-semibold mb-4">
                        Files Changed ({commit.github.files.length})
                    </h2>
                    <div className="space-y-3">
                        {commit.github.files
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((file: any, idx: number) => (
                                <Card key={idx}>
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
                        totalPages={Math.ceil(commit.github.files.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
