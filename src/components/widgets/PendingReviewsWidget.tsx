import { useNavigate } from 'react-router-dom';
import { Bell, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingReviews } from '../../hooks/useApiQueries';

interface PendingReviewsWidgetProps {
    userId: string;
}

interface PendingReview {
    prId: string;
    prNumber: number;
    title: string;
    authorLogin: string;
    repositoryId: string;
    repositoryName: string;
    ownerUsername: string;
}

export default function PendingReviewsWidget({ userId }: PendingReviewsWidgetProps) {
    const navigate = useNavigate();
    const { data: pendingReviews, isLoading } = usePendingReviews(userId);

    const handlePrClick = (pr: PendingReview) => {
        // Navigate to PR details page: /pr/{ownerUsername}/{repositoryName}/{prNumber}
        navigate(`/pr/${pr.ownerUsername}/${pr.repositoryName}/${pr.prNumber}`);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Bell className="h-4 w-4 text-red-500" />
                        Pending PR Reviews
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const reviews = pendingReviews as PendingReview[] || [];

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Bell className="h-4 w-4 text-red-500" />
                    Pending PR Reviews
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {reviews.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        No PRs awaiting your review! 🎉
                    </p>
                ) : (
                    <div className="space-y-2 h-64 overflow-y-auto pr-1">
                        {reviews.map((pr) => (
                            <div
                                key={pr.prId}
                                onClick={() => handlePrClick(pr)}
                                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                            >
                                <GitPullRequest className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">#{pr.prNumber}</span>
                                    </div>
                                    <p className="text-sm font-medium truncate">{pr.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {pr.repositoryName} · {pr.authorLogin}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

