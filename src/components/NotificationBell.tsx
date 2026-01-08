import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteNotification } from '@/hooks/useApiQueries';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: string;
    notificationType: string;
    title: string;
    message: string;
    linkUrl?: string;
    relatedFileId?: string;
    relatedRepositoryId?: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationsResponse {
    notifications: Notification[];
    totalCount: number;
    unreadCount: number;
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { resolvedTheme } = useTheme();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;

    const { data: countData } = useUnreadNotificationCount(userId);
    const { data: notificationsData, isLoading } = useNotifications(userId, 1);
    const markAsRead = useMarkNotificationAsRead();
    const markAllAsRead = useMarkAllNotificationsAsRead();
    const deleteNotification = useDeleteNotification();

    const unreadCount = (countData as { count: number })?.count || 0;
    const notifications = (notificationsData as NotificationsResponse)?.notifications || [];

    // Close dropdown when clicking outside or on other interactive elements
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Listen to both events to ensure dropdown closes
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [isOpen]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead && userId) {
            await markAsRead.mutateAsync({ notificationId: notification.id, userId });
        }

        // Navigate to the related file with notes tab opened
        if (notification.relatedFileId) {
            // Navigate to file view with notes tab active
            navigate(`/file/${notification.relatedFileId}?tab=notes`);
            setIsOpen(false);
        } else if (notification.linkUrl) {
            navigate(notification.linkUrl);
            setIsOpen(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!userId) return;
        await markAllAsRead.mutateAsync({ userId });
    };

    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        if (!userId) return;
        await deleteNotification.mutateAsync({ notificationId, userId });
    };

    if (!userId) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    // Don't stop propagation - let other dropdowns detect the click and close
                    setIsOpen(!isOpen);
                }}
                className={`relative text-muted-foreground hover:text-foreground ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : 'hover:bg-muted'}`}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {/* Dropdown - with smooth open/close animation */}
            <div
                className={`absolute right-0 mt-2 w-80 z-50 grid transition-all duration-300 ${isOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="max-h-[400px] overflow-hidden rounded-lg border bg-card shadow-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                            <h3 className="font-semibold text-card-foreground text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    disabled={markAllAsRead.isPending}
                                    className={`text-xs text-primary hover:text-primary/80 h-6 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
                                >
                                    <CheckCheck className="h-3 w-3 mr-1" />
                                    Mark all read
                                </Button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto max-h-[320px]">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`
                                            px-4 py-3 border-b cursor-pointer group
                                            hover:bg-muted/50 transition-colors
                                            ${!notification.isRead ? 'bg-primary/5' : ''}
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Unread indicator */}
                                            <div className="mt-1.5">
                                                {!notification.isRead ? (
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                ) : (
                                                    <div className="h-2 w-2 rounded-full bg-transparent" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                    </p>
                                                    {notification.linkUrl && (
                                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleDelete(e, notification.id)}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NotificationBell;
