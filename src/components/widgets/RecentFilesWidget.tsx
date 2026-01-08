import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useTheme } from '@/components/theme-provider';
import { useRecentFiles, useClearRecentFiles } from '../../hooks/useApiQueries';

interface RecentFilesWidgetProps {
    userId: string;
}

interface RecentFile {
    fileId: string;
    filePath: string;
    fileName: string;
    repositoryId: string;
    repositoryName: string;
    ownerUsername: string;
    viewedAt: string;
}

export default function RecentFilesWidget({ userId }: RecentFilesWidgetProps) {
    const navigate = useNavigate();
    const { data: recentFiles, isLoading } = useRecentFiles(userId);
    const clearRecentFiles = useClearRecentFiles();
    const { resolvedTheme } = useTheme();
    const [showClearDialog, setShowClearDialog] = useState(false);

    const handleFileClick = (file: RecentFile) => {
        navigate(`/file/${file.fileId}`);
    };

    const handleClearAll = () => {
        setShowClearDialog(true);
    };

    const confirmClearAll = () => {
        clearRecentFiles.mutate({ userId });
        setShowClearDialog(false);
    };

    const formatTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-primary" />
                        Recent Files
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const files = recentFiles as RecentFile[] || [];

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4 text-primary" />
                            Recent Files
                        </CardTitle>
                        {files.length > 0 && (
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-6 w-6 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className={`cursor-pointer ${resolvedTheme === 'light'
                                            ? 'text-red-600 focus:text-red-600 focus:bg-red-50'
                                            : 'text-red-400 focus:text-red-400 focus:bg-red-950/50'
                                            }`}
                                        onClick={handleClearAll}
                                        disabled={clearRecentFiles.isPending}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Clear all
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {files.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">
                            No recent files. Start exploring repositories!
                        </p>
                    ) : (
                        <div className="space-y-1 h-64 overflow-y-auto pr-1">
                            {files.slice(0, 10).map((file) => (
                                <div
                                    key={file.fileId}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group"
                                >
                                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {file.fileName}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {file.repositoryName} • {formatTimeAgo(file.viewedAt)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
                                        onClick={() => handleFileClick(file)}
                                    >
                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear Recent Files</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to clear all recent files? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={`${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmClearAll}
                            className={`${resolvedTheme === 'light'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                        >
                            Clear All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
