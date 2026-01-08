import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Bookmark, FileText, ExternalLink, Trash2, MoreVertical } from 'lucide-react';
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
import { useBookmarks, useRemoveBookmark, useClearBookmarks } from '../../hooks/useApiQueries';

interface BookmarksWidgetProps {
    userId: string;
}

interface BookmarkedFile {
    fileId: string;
    filePath: string;
    fileName: string;
    repositoryId: string;
    repositoryName: string;
    ownerUsername: string;
    category: string | null;
    createdAt: string;
}

export default function BookmarksWidget({ userId }: BookmarksWidgetProps) {
    const navigate = useNavigate();
    const { data: bookmarks, isLoading } = useBookmarks(userId);
    const removeBookmark = useRemoveBookmark();
    const clearBookmarks = useClearBookmarks();
    const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
    const [deleteFileName, setDeleteFileName] = useState<string>('');
    const [showClearDialog, setShowClearDialog] = useState(false);
    const { resolvedTheme } = useTheme();

    const handleFileClick = (file: BookmarkedFile) => {
        navigate(`/file/${file.fileId}`);
    };

    const handleRemoveClick = (e: React.MouseEvent, file: BookmarkedFile) => {
        e.stopPropagation();
        setDeleteFileId(file.fileId);
        setDeleteFileName(file.fileName);
    };

    const confirmRemove = () => {
        if (deleteFileId) {
            removeBookmark.mutate({ userId, fileId: deleteFileId });
        }
        setDeleteFileId(null);
        setDeleteFileName('');
    };

    const handleClearAll = () => {
        setShowClearDialog(true);
    };

    const confirmClearAll = () => {
        clearBookmarks.mutate({ userId });
        setShowClearDialog(false);
    };

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Bookmark className="h-4 w-4 text-yellow-500" />
                        Bookmarks
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

    const files = bookmarks as BookmarkedFile[] || [];

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Bookmark className="h-4 w-4 text-yellow-500" />
                            Bookmarks
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
                                        disabled={clearBookmarks.isPending}
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
                            No bookmarked files. Star files for quick access!
                        </p>
                    ) : (
                        <div className="space-y-1 h-64 overflow-y-auto pr-1">
                            {files.slice(0, 30).map((file) => {
                                return (
                                    <div
                                        key={file.fileId}
                                        className="flex items-center gap-3 p-2 rounded-md transition-colors group hover:bg-muted"
                                    >
                                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {file.fileName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {file.repositoryName}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-6 w-6 transition-opacity flex-shrink-0 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''} opacity-0 group-hover:opacity-100`}
                                            onClick={() => handleFileClick(file)}
                                        >
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-6 w-6 transition-opacity flex-shrink-0 opacity-0 group-hover:opacity-100 ${resolvedTheme === 'light' ? 'hover:bg-red-50' : 'hover:bg-red-950/50'}`}
                                            onClick={(e) => handleRemoveClick(e, file)}
                                        >
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Single Bookmark Dialog */}
            <AlertDialog open={!!deleteFileId} onOpenChange={(open) => !open && setDeleteFileId(null)}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Bookmark</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove "{deleteFileName}" from your bookmarks?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={`${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemove}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear All Bookmarks Dialog */}
            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Bookmarks</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to clear all bookmarks? This action cannot be undone.
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
