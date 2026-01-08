import { BarChart3, FolderOpen, Bookmark, Eye, GitCommit, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuickStats, usePendingReviews } from '../../hooks/useApiQueries';

interface QuickStatsWidgetProps {
    userId: string;
}

interface Stats {
    filesViewed: number;
    repositoriesAccessed: number;
    bookmarksCount: number;
    commitsThisWeek: number;
    prsReviewedThisWeek: number;
}

export default function QuickStatsWidget({ userId }: QuickStatsWidgetProps) {
    const { data: stats, isLoading } = useQuickStats(userId);
    const { data: pendingReviews } = usePendingReviews(userId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Quick Stats
                        <span className="text-xs text-muted-foreground font-normal">(This Week)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const data = stats as Stats || {
        filesViewed: 0,
        repositoriesAccessed: 0,
        bookmarksCount: 0,
        commitsThisWeek: 0,
        prsReviewedThisWeek: 0
    };

    const statItems = [
        {
            label: 'Files Viewed',
            value: data.filesViewed,
            icon: Eye,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10'
        },
        {
            label: 'Repositories',
            value: data.repositoriesAccessed,
            icon: FolderOpen,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        },
        {
            label: 'Bookmarks',
            value: data.bookmarksCount,
            icon: Bookmark,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10'
        },
        {
            label: 'Commits',
            value: data.commitsThisWeek,
            icon: GitCommit,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10'
        },
        {
            label: 'PRs Pending',
            value: (pendingReviews as any[])?.length || 0,
            icon: MessageSquare,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10'
        }
    ];

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Quick Stats
                    <span className="text-xs text-muted-foreground font-normal">(This Week)</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {statItems.map((item) => (
                        <div
                            key={item.label}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg ${item.bgColor}`}
                        >
                            <item.icon className={`h-5 w-5 ${item.color} mb-1`} />
                            <span className="text-2xl font-bold">{item.value}</span>
                            <span className="text-xs text-muted-foreground text-center">{item.label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

