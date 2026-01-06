import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, MessageSquare, Upload, Trash2, FileText, Download, User } from 'lucide-react';
import { useFileStickyNotes, useCreateFileStickyNote, useUploadFileDocument, useDeleteStickyNote, useFileDiscussion, usePostFileMessage, useDeleteDiscussionMessage, useUsersWithRepoAccess } from '@/hooks/useApiQueries';
import { formatDistanceToNow } from 'date-fns';

interface NotesTabProps {
    fileId: string;
    file: any;
}

interface StickyNoteData {
    id: string;
    noteType: string;
    content?: string;
    documentUrl?: string;
    documentName?: string;
    documentSize?: number;
    createdByUserId: string;
    createdByUsername: string;
    createdByAvatarUrl?: string;
    createdAt: string;
}

interface DiscussionMessage {
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    message: string;
    referencedLineNumbers?: number[];
    createdAt: string;
}

interface DiscussionThread {
    id: string;
    messages: DiscussionMessage[];
}

interface UserSuggestion {
    id: string;
    username: string;
    avatarUrl?: string;
}

export function NotesTab({ fileId, file }: NotesTabProps) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;

    // Debug logging
    console.log('NotesTab - file object:', file);
    console.log('NotesTab - file.RepositoryId:', file?.RepositoryId);
    console.log('NotesTab - file.repositoryId:', file?.repositoryId);

    const repositoryId = file?.RepositoryId || file?.repositoryId || '';
    console.log('NotesTab - final repositoryId:', repositoryId);

    if (!repositoryId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Unable to load notes - repository ID not found</p>
                <p className="text-xs mt-2">Please refresh the page</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StickyNotesSection fileId={fileId} repositoryId={repositoryId} userId={userId} />
            <DiscussionSection fileId={fileId} repositoryId={repositoryId} userId={userId} />
        </div>
    );
}

// ==========================================
// STICKY NOTES SECTION
// ==========================================

function StickyNotesSection({ fileId, repositoryId, userId }: { fileId: string; repositoryId: string; userId: string }) {
    const [newNote, setNewNote] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: notes, isLoading } = useFileStickyNotes(fileId);
    const createNote = useCreateFileStickyNote();
    const uploadDocument = useUploadFileDocument();
    const deleteNote = useDeleteStickyNote();

    const handleCreateNote = async () => {
        if (!newNote.trim() || !userId) return;

        await createNote.mutateAsync({
            userId,
            data: { repositoryId, fileId, content: newNote }
        });
        setNewNote('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        await uploadDocument.mutateAsync({
            userId,
            repositoryId,
            fileId,
            file
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!userId) return;
        await deleteNote.mutateAsync({ noteId, userId, fileId });
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className="bg-card border rounded-lg shadow-sm">
            <CardHeader className="pb-4 bg-muted/50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <StickyNote className="h-5 w-5 text-primary" />
                    </div>
                    Sticky Notes
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {/* Create Note Form */}
                <div className="space-y-3">
                    <Textarea
                        placeholder="Add a note about this file... (Enter to save, Shift+Enter for new line)"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleCreateNote();
                            }
                        }}
                        className="min-h-[80px] bg-background border text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="flex gap-2">
                        <Button
                            onClick={handleCreateNote}
                            disabled={!newNote.trim() || createNote.isPending}
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            <StickyNote className="h-4 w-4 mr-1" />
                            Add Note
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".pdf,.txt,.docx,.doc,.md"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadDocument.isPending}
                            size="sm"
                            variant="outline"
                            className="border text-foreground hover:bg-muted"
                        >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Document
                        </Button>
                    </div>
                </div>

                {/* Notes List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-4 text-muted-foreground">Loading notes...</div>
                    ) : (notes as StickyNoteData[] || []).length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No notes yet. Add the first one!</div>
                    ) : (
                        (notes as StickyNoteData[] || []).map((note) => (
                            <div key={note.id} className="p-3 rounded-lg bg-muted/30 border group">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {note.createdByAvatarUrl ? (
                                            <img src={note.createdByAvatarUrl} alt="" className="h-5 w-5 rounded-full" />
                                        ) : (
                                            <User className="h-4 w-4" />
                                        )}
                                        <span className="font-medium text-foreground">{note.createdByUsername}</span>
                                        <span>•</span>
                                        <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                                    </div>
                                    {note.createdByUserId === userId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                {note.noteType === 'text' ? (
                                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                                ) : (
                                    <div className="mt-2 flex items-center gap-2 p-2 rounded bg-muted/50">
                                        <FileText className="h-5 w-5 text-accent" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-foreground truncate">{note.documentName}</p>
                                            <p className="text-xs text-muted-foreground">{formatFileSize(note.documentSize)}</p>
                                        </div>
                                        <a
                                            href={note.documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded hover:bg-muted"
                                        >
                                            <Download className="h-4 w-4 text-accent" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ==========================================
// DISCUSSION SECTION
// ==========================================

function DiscussionSection({ fileId, repositoryId, userId }: { fileId: string; repositoryId: string; userId: string }) {
    const [newMessage, setNewMessage] = useState('');
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: thread, isLoading } = useFileDiscussion(fileId);
    const postMessage = usePostFileMessage();
    const deleteMessage = useDeleteDiscussionMessage();
    const { data: usersData } = useUsersWithRepoAccess(repositoryId);

    const users = (usersData as UserSuggestion[] || []);

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNewMessage(value);

        // Check for @ mentions
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch && atMatch[1] !== undefined) {
            setMentionSearch(atMatch[1]);
            setShowMentionDropdown(true);
            setSelectedMentionIndex(0); // Reset selection when search changes

            // Calculate dropdown position
            const textarea = e.target;
            const coordinates = getCaretCoordinates(textarea, cursorPos);
            setMentionPosition({ top: coordinates.top + 20, left: coordinates.left });
        } else {
            setShowMentionDropdown(false);
            setSelectedMentionIndex(0);
        }
    };

    const insertMention = (username: string) => {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = newMessage.substring(0, cursorPos);
        const textAfterCursor = newMessage.substring(cursorPos);

        const atIndex = textBeforeCursor.lastIndexOf('@');
        const newText = textBeforeCursor.substring(0, atIndex) + `@${username} ` + textAfterCursor;

        setNewMessage(newText);
        setShowMentionDropdown(false);
        setSelectedMentionIndex(0);

        // Focus back on textarea and position cursor after the mention
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = textBeforeCursor.substring(0, atIndex).length + username.length + 2; // +2 for @ and space
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 5);

    const handlePostMessage = async () => {
        if (!newMessage.trim() || !userId) return;

        await postMessage.mutateAsync({
            fileId,
            userId,
            message: newMessage
        });
        setNewMessage('');
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!userId) return;
        await deleteMessage.mutateAsync({ messageId, userId, fileId });
    };

    const threadData = thread as DiscussionThread | null;

    return (
        <Card className="bg-card border rounded-lg shadow-sm">
            <CardHeader className="pb-4 bg-muted/50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
                    <div className="p-1.5 rounded-lg bg-accent/10">
                        <MessageSquare className="h-5 w-5 text-accent" />
                    </div>
                    Discussion
                    <span className="text-sm font-normal text-muted-foreground">
                        ({(threadData?.messages || []).length} messages)
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {/* Messages List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-4 text-muted-foreground">Loading discussion...</div>
                    ) : (threadData?.messages || []).length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                            No discussion yet. Start the conversation!
                            <p className="text-xs mt-1">Use @username to mention someone, #L42 to reference a line</p>
                        </div>
                    ) : (
                        [...(threadData?.messages || [])].reverse().map((msg) => (
                            <div key={msg.id} className="p-3 rounded-lg bg-muted/30 border group">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {msg.avatarUrl ? (
                                            <img src={msg.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
                                        ) : (
                                            <User className="h-4 w-4" />
                                        )}
                                        <span className="font-medium text-foreground">{msg.username}</span>
                                        <span>•</span>
                                        <span>{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                                    </div>
                                    {msg.userId === userId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                                {msg.referencedLineNumbers && msg.referencedLineNumbers.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {msg.referencedLineNumbers.map((line) => (
                                            <span key={line} className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">
                                                Line {line}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Post Message Form */}
                <div className="relative space-y-3 pt-3 border-t">
                    <Textarea
                        ref={textareaRef}
                        placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
                        value={newMessage}
                        onChange={handleMessageChange}
                        onKeyDown={(e) => {
                            // Handle mention dropdown navigation when it's visible with users
                            if (showMentionDropdown && filteredUsers.length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedMentionIndex(prev =>
                                        prev < filteredUsers.length - 1 ? prev + 1 : 0
                                    );
                                    return;
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedMentionIndex(prev =>
                                        prev > 0 ? prev - 1 : filteredUsers.length - 1
                                    );
                                    return;
                                } else if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    insertMention(filteredUsers[selectedMentionIndex].username);
                                    return;
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setShowMentionDropdown(false);
                                    setSelectedMentionIndex(0);
                                    return;
                                }
                            }
                            // Send message on Enter (when dropdown is not active)
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handlePostMessage();
                            }
                        }}
                        className="min-h-[60px] bg-background border text-foreground placeholder:text-muted-foreground"
                    />

                    {/* @Mention Dropdown */}
                    {showMentionDropdown && filteredUsers.length > 0 && (
                        <div
                            className="absolute z-50 bg-card border rounded-lg shadow-xl max-h-48 overflow-y-auto"
                            style={{ top: `${mentionPosition.top}px`, left: `${mentionPosition.left}px` }}
                        >
                            {filteredUsers.map((user, index) => (
                                <button
                                    key={user.id}
                                    onClick={() => insertMention(user.username)}
                                    className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${index === selectedMentionIndex
                                        ? 'bg-accent/20 text-accent'
                                        : 'hover:bg-muted text-foreground'
                                        }`}
                                >
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                                    ) : (
                                        <User className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <span>{user.username}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={handlePostMessage}
                        disabled={!newMessage.trim() || postMessage.isPending}
                        size="sm"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Post Message
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper function to get caret coordinates in textarea
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
    const div = document.createElement('div');
    const style = getComputedStyle(element);
    const properties = [
        'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
        'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign',
        'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing'
    ];

    properties.forEach(prop => {
        div.style[prop as any] = style[prop as any];
    });

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.textContent = element.value.substring(0, position);

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    document.body.appendChild(div);
    const { offsetTop: top, offsetLeft: left } = span;
    document.body.removeChild(div);

    return { top, left };
}

export default NotesTab;
