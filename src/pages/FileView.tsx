import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Code, BarChart, FileText, ChevronLeft, ChevronRight, Clock, MessageSquare, Bookmark } from 'lucide-react';
import BackButton from '../components/BackButton';
import FileAnalysis from '../components/FileAnalysis';
import NotesTab from '../components/NotesTab';
import PersonalNotesPanel from '../components/PersonalNotesPanel';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/components/theme-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Split from 'react-split';
import '../split.css';
import { useFile, useFileAnalysis, useFileContent, useFileCommits, useTrackFileView, useIsBookmarked, useAddBookmark, useRemoveBookmark } from '../hooks/useApiQueries';

export default function FileView() {
    const { fileId } = useParams<{ fileId: string }>();
    const [searchParams] = useSearchParams();
    const { resolvedTheme } = useTheme();

    // Get tab from URL params (default to 'code')
    const tabParam = searchParams.get('tab') as 'code' | 'analysis' | 'notes' | null;
    const [activeTab, setActiveTab] = useState<'code' | 'analysis' | 'notes'>(tabParam || 'code');
    const [currentCommitSha, setCurrentCommitSha] = useState<string | null>(null);

    // Get branch from URL params
    const branch = searchParams.get('branch') || undefined;

    // React Query hooks for data fetching with caching
    const { data: file, isLoading: fileLoading, error: fileError } = useFile(fileId);
    const { data: analysis } = useFileAnalysis(fileId);
    const { data: commitHistory = [] } = useFileCommits(fileId);
    const { data: contentData, isLoading: contentLoading } = useFileContent(fileId, currentCommitSha || undefined, branch);

    const content = contentData?.content || '';
    const totalLinesCount = content ? content.split('\n').length : 0;
    const loading = fileLoading || contentLoading;
    const error = fileError?.message || '';

    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    const userId = storedUser ? JSON.parse(storedUser).id : undefined;

    // Dashboard tracking hooks
    const trackFileView = useTrackFileView();
    const { data: bookmarkData } = useIsBookmarked(userId, fileId);
    const addBookmark = useAddBookmark();
    const removeBookmark = useRemoveBookmark();
    const isBookmarked = bookmarkData?.isBookmarked || false;

    // Set initial commit sha from content response or history
    useEffect(() => {
        if (contentData?.commitSha && !currentCommitSha) {
            setCurrentCommitSha(contentData.commitSha);
        } else if (commitHistory.length > 0 && !currentCommitSha) {
            setCurrentCommitSha(commitHistory[0].sha);
        }
    }, [contentData, commitHistory, currentCommitSha]);

    // Track file view when component mounts
    useEffect(() => {
        if (userId && fileId) {
            trackFileView.mutate({ userId, fileId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, fileId]);

    // Determine if current theme is light
    const isLightTheme = resolvedTheme === 'light';

    const getLanguageFromPath = (filePath: string): string => {
        const extension = filePath.split('.').pop()?.toLowerCase();
        const languageMap: { [key: string]: string } = {
            'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
            'py': 'python', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
            'go': 'go', 'rs': 'rust', 'rb': 'ruby', 'php': 'php', 'swift': 'swift',
            'kt': 'kotlin', 'dart': 'dart', 'html': 'html', 'css': 'css',
            'scss': 'scss', 'json': 'json', 'xml': 'xml', 'yaml': 'yaml',
            'yml': 'yaml', 'md': 'markdown', 'sql': 'sql', 'sh': 'bash', 'bash': 'bash',
        };
        return languageMap[extension || ''] || 'javascript';
    };

    const handlePreviousCommit = () => {
        if (!commitHistory.length) return;
        const currentIndex = currentCommitSha ? commitHistory.findIndex((c: { sha: string }) => c.sha === currentCommitSha) : -1;

        if (currentIndex === -1) {
            setCurrentCommitSha(commitHistory[0].sha);
        } else if (currentIndex < commitHistory.length - 1) {
            const prevCommit = commitHistory[currentIndex + 1];
            setCurrentCommitSha(prevCommit.sha);
        }
    };

    const handleNextCommit = () => {
        if (!commitHistory.length || !currentCommitSha) return;
        const currentIndex = commitHistory.findIndex((c: { sha: string }) => c.sha === currentCommitSha);
        if (currentIndex > 0) {
            const nextCommit = commitHistory[currentIndex - 1];
            setCurrentCommitSha(nextCommit.sha);
        }
    };

    if (loading) {
        return (
            <div className="container-custom py-8 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-96 w-full" />
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

    if (!file) {
        return (
            <div className="container-custom py-8">
                <BackButton />
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="font-heading text-lg font-semibold">File not found</h3>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentIndex = currentCommitSha ? commitHistory.findIndex((c: { sha: string }) => c.sha === currentCommitSha) : -1;
    const canGoPrevious = (currentIndex !== -1 && currentIndex < commitHistory.length - 1) || (currentIndex === -1 && commitHistory.length > 0);
    const canGoNext = currentIndex !== -1 && currentIndex > 0;

    return (
        <div className="container-custom py-8 animate-fade-in">
            <BackButton />

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="font-heading text-3xl font-bold mb-2 font-mono">
                                {file?.filePath || 'Unknown file'}
                            </h1>
                            {userId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}
                                    onClick={() => {
                                        if (isBookmarked) {
                                            removeBookmark.mutate({ userId, fileId: fileId! });
                                        } else {
                                            addBookmark.mutate({ userId, fileId: fileId! });
                                        }
                                    }}
                                    title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                                >
                                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                                </Button>
                            )}
                        </div>
                        {file?.totalLines && (
                            <p className="text-muted-foreground text-sm">
                                {file.totalLines} lines
                            </p>
                        )}
                    </div>
                </div>

                {currentCommitSha && (
                    <Card>
                        <CardContent className="py-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <code className="text-primary font-mono">{currentCommitSha.substring(0, 7)}</code>
                                {commitHistory.find((c: { sha: string }) => c.sha === currentCommitSha) && (
                                    <>
                                        <span className="text-muted-foreground">•</span>
                                        <span>{commitHistory.find((c: { sha: string; message: string }) => c.sha === currentCommitSha)?.message}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-muted-foreground">
                                            {new Date(commitHistory.find((c: { sha: string; committedAt: string }) => c.sha === currentCommitSha)?.committedAt || '').toLocaleDateString()}
                                        </span>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full max-w-lg grid-cols-3">
                    <TabsTrigger value="code" className="gap-2">
                        <Code className="h-4 w-4" />
                        Code View
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="gap-2">
                        <BarChart className="h-4 w-4" />
                        File Analysis
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Notes
                    </TabsTrigger>
                </TabsList>

                {/* Code View Tab */}
                <TabsContent value="code" className="mt-6">
                    <Split
                        className="flex"
                        sizes={[60, 40]}
                        minSize={[300, 200]}
                        gutterSize={12}
                        direction="horizontal"
                    >
                        <div className="space-y-4 pr-2 overflow-auto">
                            <Card>
                                <CardContent className="p-0">
                                    <SyntaxHighlighter
                                        language={getLanguageFromPath(file?.filePath || '')}
                                        style={isLightTheme ? vs : vscDarkPlus}
                                        showLineNumbers={true}
                                        wrapLines={true}
                                        customStyle={{
                                            background: 'transparent',
                                            margin: 0,
                                            padding: '1rem',
                                            fontSize: '13px',
                                            lineHeight: '1.6',
                                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                        }}
                                        codeTagProps={{
                                            style: {
                                                fontSize: '13px',
                                                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                            }
                                        }}
                                        lineNumberStyle={{
                                            minWidth: '3em',
                                            paddingRight: '1em',
                                            color: isLightTheme ? '#666' : '#6e7681',
                                            userSelect: 'none',
                                            fontSize: '13px',
                                        }}
                                    >
                                        {content}
                                    </SyntaxHighlighter>
                                </CardContent>
                            </Card>

                            {/* Commit Navigation */}
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handlePreviousCommit}
                                    disabled={!canGoPrevious}
                                    variant="outline"
                                    size="sm"
                                    className={`gap-2 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous Commit
                                </Button>
                                <Button
                                    onClick={handleNextCommit}
                                    disabled={!canGoNext}
                                    variant="outline"
                                    size="sm"
                                    className={`gap-2 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
                                >
                                    Next Commit
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                {commitHistory.length > 0 && (
                                    <Badge variant="secondary">
                                        {currentIndex !== -1
                                            ? `Commit ${commitHistory.length - currentIndex} of ${commitHistory.length}`
                                            : 'Latest Unindexed Commit'}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="pl-2 overflow-auto">
                            <PersonalNotesPanel fileId={fileId!} repositoryId={file?.repositoryId} totalLines={totalLinesCount} />
                        </div>
                    </Split>
                </TabsContent>

                {/* File Analysis Tab */}
                <TabsContent value="analysis" className="mt-6">
                    {analysis ? (
                        <FileAnalysis file={file} analysis={analysis} />
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-heading text-lg font-semibold mb-2">No Analysis Available</h3>
                                <p className="text-muted-foreground text-sm">
                                    Analysis data is not available for this file.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-6">
                    <NotesTab fileId={fileId!} file={file} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
