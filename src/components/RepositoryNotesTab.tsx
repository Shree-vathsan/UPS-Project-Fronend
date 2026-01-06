import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, MessageSquare, Trash2, FileText, Download, User, GitBranch, File as FileIcon, X, Upload } from 'lucide-react';
import { useRepoStickyNotes, useCreateRepoStickyNote, useUploadRepoDocument, useDeleteStickyNote, useRepoDiscussion, usePostRepoMessage, useDeleteDiscussionMessage, useUsersWithRepoAccess, useBranches, useFiles, useRepoPersonalNotes, useCreateRepoPersonalNote, useDeletePersonalNote } from '@/hooks/useApiQueries';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RepositoryNotesTabProps {
    repositoryId: string;
}

interface TaggedFile {
    id: string;
    filePath: string;
}

interface TaggedBranch {
    id: string;
    name: string;
}

interface StickyNoteData {
    id: string;
    noteType: string;
    content?: string;
    documentUrl?: string;
    documentName?: string;
    documentSize?: number;
    taggedFileIds?: string[];
    taggedFiles?: TaggedFile[];
    taggedBranchIds?: string[];
    taggedBranches?: TaggedBranch[];
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
    taggedFileIds?: string[];
    taggedFiles?: TaggedFile[];
    taggedBranchIds?: string[];
    taggedBranches?: TaggedBranch[];
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

interface FileSuggestion {
    id: string;
    filePath: string;
}

export function RepositoryNotesTab({ repositoryId }: RepositoryNotesTabProps) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;
    const navigate = useNavigate();

    const { data: branchesData } = useBranches(repositoryId);
    const { data: filesData } = useFiles(repositoryId);
    const branches = (branchesData as any[] || []);
    const files = (filesData as any[] || []);

    // Handler for file click navigation - simplified
    const handleFileClick = (file: { id: string; filePath: string }, taggedBranchIds?: string[]) => {
        // If branch is tagged, use the first tagged branch
        if (taggedBranchIds && taggedBranchIds.length > 0) {
            const taggedBranch = branches.find((b: any) => taggedBranchIds.includes(b.id));
            if (taggedBranch) {
                navigate(`/file/${file.id}?branch=${encodeURIComponent(taggedBranch.name)}`);
                return;
            }
        }

        // No branch tagged - navigate without branch param
        navigate(`/file/${file.id}`);
    };

    if (!repositoryId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Unable to load notes - repository ID not found</p>
                <p className="text-xs mt-2">Please refresh the page</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* First Row: Discussion (full width) */}
            <DiscussionSection
                repositoryId={repositoryId}
                userId={userId}
                onFileClick={handleFileClick}
                files={files}
            />

            {/* Second Row: Sticky Notes and Personal Notes (50/50) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StickyNotesSection
                    repositoryId={repositoryId}
                    userId={userId}
                    onFileClick={handleFileClick}
                    files={files}
                />
                <PersonalNotesSection
                    repositoryId={repositoryId}
                    userId={userId}
                    onFileClick={handleFileClick}
                    files={files}
                />
            </div>
        </div>
    );
}

// ==========================================
// STICKY NOTES SECTION
// ==========================================

function StickyNotesSection({ repositoryId, userId, onFileClick, files: allFiles }: {
    repositoryId: string;
    userId: string;
    onFileClick: (file: { id: string; filePath: string }, taggedBranchIds?: string[]) => void;
    files: any[];
}) {
    const [newNote, setNewNote] = useState('');
    const [showBranchSelector, setShowBranchSelector] = useState(false);
    const [showFileDropdown, setShowFileDropdown] = useState(false);
    const [fileSearch, setFileSearch] = useState('');
    const [fileDropdownPosition, setFileDropdownPosition] = useState({ top: 0, left: 0 });
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: notes, isLoading } = useRepoStickyNotes(repositoryId);
    const createNote = useCreateRepoStickyNote();
    const uploadDocument = useUploadRepoDocument();
    const deleteNote = useDeleteStickyNote();
    const { data: filesData } = useFiles(repositoryId);
    const { data: branchesData } = useBranches(repositoryId);

    const files = (filesData as any[] || []);
    const branches = (branchesData as any[] || []);

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNewNote(value);

        // Check for # file references
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const hashMatch = textBeforeCursor.match(/#([^#\s]*)$/);

        if (hashMatch && hashMatch[1] !== undefined) {
            setFileSearch(hashMatch[1]);
            setShowFileDropdown(true);
            setSelectedFileIndex(0);

            const textarea = e.target;
            const coordinates = getCaretCoordinates(textarea, cursorPos);
            setFileDropdownPosition({ top: coordinates.top + 20, left: coordinates.left });
        } else {
            setShowFileDropdown(false);
            setSelectedFileIndex(0);
        }
    };

    const insertFileRef = (file: FileSuggestion) => {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = newNote.substring(0, cursorPos);
        const textAfterCursor = newNote.substring(cursorPos);

        const hashIndex = textBeforeCursor.lastIndexOf('#');
        const newText = textBeforeCursor.substring(0, hashIndex) + `#${file.filePath} ` + textAfterCursor;

        setNewNote(newText);
        setShowFileDropdown(false);
        setSelectedFileIndex(0);

        // Add to selected files
        if (!selectedFileIds.includes(file.id)) {
            setSelectedFileIds(prev => [...prev, file.id]);
        }

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = textBeforeCursor.substring(0, hashIndex).length + file.filePath.length + 2;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const filteredFiles = files.filter((f: any) =>
        f.filePath.toLowerCase().includes(fileSearch.toLowerCase())
    ).slice(0, 5);

    const handleCreateNote = async () => {
        if (!newNote.trim() || !userId) return;

        await createNote.mutateAsync({
            userId,
            data: {
                repositoryId,
                content: newNote,
                taggedFileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
                taggedBranchIds: selectedBranchIds.length > 0 ? selectedBranchIds : undefined
            }
        });
        setNewNote('');
        setSelectedFileIds([]);
        setSelectedBranchIds([]);
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!userId) return;
        await deleteNote.mutateAsync({ noteId, userId, fileId: undefined });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        await uploadDocument.mutateAsync({
            userId,
            repositoryId,
            file,
            taggedFileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    const toggleBranch = (branchId: string) => {
        setSelectedBranchIds(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const removeFile = (fileId: string) => {
        setSelectedFileIds(prev => prev.filter(id => id !== fileId));
    };

    const getSelectedFiles = () => files.filter((f: any) => selectedFileIds.includes(f.id));
    const getSelectedBranches = () => branches.filter((b: any) => selectedBranchIds.includes(b.id));

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
                    Repository Sticky Notes
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {/* Create Note Form */}
                <div className="space-y-3">
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            placeholder="Add a note... (Enter to save, Shift+Enter for new line, #filename to tag files)"
                            value={newNote}
                            onChange={handleNoteChange}
                            onKeyDown={(e) => {
                                // Handle file dropdown navigation
                                if (showFileDropdown && filteredFiles.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setSelectedFileIndex(prev =>
                                            prev < filteredFiles.length - 1 ? prev + 1 : 0
                                        );
                                        return;
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setSelectedFileIndex(prev =>
                                            prev > 0 ? prev - 1 : filteredFiles.length - 1
                                        );
                                        return;
                                    } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                                        e.preventDefault();
                                        insertFileRef(filteredFiles[selectedFileIndex]);
                                        return;
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setShowFileDropdown(false);
                                        setSelectedFileIndex(0);
                                        return;
                                    }
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCreateNote();
                                }
                            }}
                            className="min-h-[80px] bg-background border text-foreground placeholder:text-muted-foreground"
                        />

                        {/* #File Dropdown */}
                        {showFileDropdown && filteredFiles.length > 0 && (
                            <div
                                className="absolute z-50 bg-card border rounded-lg shadow-xl max-h-48 overflow-y-auto min-w-[250px]"
                                style={{ top: `${fileDropdownPosition.top}px`, left: `${fileDropdownPosition.left}px` }}
                            >
                                {filteredFiles.map((file: any, index) => (
                                    <button
                                        key={file.id}
                                        onClick={() => insertFileRef(file)}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${index === selectedFileIndex
                                            ? 'bg-green-500/20 text-green-500'
                                            : 'hover:bg-muted text-foreground'
                                            }`}
                                    >
                                        <FileIcon className="h-4 w-4" />
                                        <span className="truncate">{file.filePath}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Files/Branches Display */}
                    {(getSelectedFiles().length > 0 || getSelectedBranches().length > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {getSelectedBranches().map((branch: any) => (
                                <div key={branch.id} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <GitBranch className="h-3 w-3" />
                                    <span>{branch.name}</span>
                                    <button onClick={() => toggleBranch(branch.id)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {getSelectedFiles().map((file: any) => (
                                <div key={file.id} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-500 border border-green-500/20">
                                    <FileIcon className="h-3 w-3" />
                                    <span className="max-w-[150px] truncate">{file.filePath}</span>
                                    <button onClick={() => removeFile(file.id)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

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
                        <Button
                            onClick={() => setShowBranchSelector(!showBranchSelector)}
                            size="sm"
                            variant="outline"
                            className="border text-foreground hover:bg-muted"
                        >
                            <GitBranch className="h-4 w-4 mr-1" />
                            Tag Branches ({selectedBranchIds.length})
                        </Button>
                    </div>

                    {/* Branch Selector */}
                    {showBranchSelector && (
                        <div className="border rounded-md p-3 bg-muted/30 max-h-48 overflow-y-auto">
                            <div className="text-sm font-medium mb-2">Select Branches</div>
                            {branches.map((branch: any) => (
                                <label key={branch.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 px-2 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedBranchIds.includes(branch.id)}
                                        onChange={() => toggleBranch(branch.id)}
                                        className="rounded"
                                    />
                                    <GitBranch className="h-4 w-4" />
                                    <span className="text-sm">{branch.name}</span>
                                    {branch.isDefault && <span className="text-xs text-muted-foreground">(default)</span>}
                                </label>
                            ))}
                        </div>
                    )}
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
                                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{parseTextWithFileRefs(note.content || '', allFiles, onFileClick, note.taggedBranchIds)}</p>
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

                                {/* Tagged Branches and Files */}
                                {(note.taggedBranches?.length || note.taggedFiles?.length) && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {note.taggedBranches?.map((branch) => (
                                            <div key={branch.id} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-blue-500/10 text-blue-500">
                                                <GitBranch className="h-3 w-3" />
                                                <span>{branch.name}</span>
                                            </div>
                                        ))}
                                        {note.taggedFiles?.map((file) => (
                                            <div
                                                key={file.id}
                                                onClick={() => onFileClick(file, note.taggedBranchIds)}
                                                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-green-500/10 text-green-500 cursor-pointer hover:bg-green-500/20 transition-colors"
                                            >
                                                <FileIcon className="h-3 w-3" />
                                                <span className="max-w-[120px] truncate">{file.filePath}</span>
                                            </div>
                                        ))}
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

function DiscussionSection({ repositoryId, userId, onFileClick, files: allFiles }: {
    repositoryId: string;
    userId: string;
    onFileClick: (file: { id: string; filePath: string }, taggedBranchIds?: string[]) => void;
    files: any[];
}) {
    const [newMessage, setNewMessage] = useState('');
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const [showFileDropdown, setShowFileDropdown] = useState(false);
    const [fileSearch, setFileSearch] = useState('');
    const [fileDropdownPosition, setFileDropdownPosition] = useState({ top: 0, left: 0 });
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [showBranchSelector, setShowBranchSelector] = useState(false);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: thread, isLoading } = useRepoDiscussion(repositoryId);
    const postMessage = usePostRepoMessage();
    const deleteMessage = useDeleteDiscussionMessage();
    const { data: usersData } = useUsersWithRepoAccess(repositoryId);
    const { data: filesData } = useFiles(repositoryId);
    const { data: branchesData } = useBranches(repositoryId);

    const users = (usersData as UserSuggestion[] || []);
    const files = (filesData as any[] || []);
    const branches = (branchesData as any[] || []);

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNewMessage(value);

        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);

        // Check for @ mentions
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        // Check for # file references
        const hashMatch = textBeforeCursor.match(/#([^#\s]*)$/);

        if (atMatch && atMatch[1] !== undefined) {
            setMentionSearch(atMatch[1]);
            setShowMentionDropdown(true);
            setSelectedMentionIndex(0);
            setShowFileDropdown(false);

            const textarea = e.target;
            const coordinates = getCaretCoordinates(textarea, cursorPos);
            setMentionPosition({ top: coordinates.top + 20, left: coordinates.left });
        } else if (hashMatch && hashMatch[1] !== undefined) {
            setFileSearch(hashMatch[1]);
            setShowFileDropdown(true);
            setSelectedFileIndex(0);
            setShowMentionDropdown(false);

            const textarea = e.target;
            const coordinates = getCaretCoordinates(textarea, cursorPos);
            setFileDropdownPosition({ top: coordinates.top + 20, left: coordinates.left });
        } else {
            setShowMentionDropdown(false);
            setShowFileDropdown(false);
            setSelectedMentionIndex(0);
            setSelectedFileIndex(0);
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

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = textBeforeCursor.substring(0, atIndex).length + username.length + 2;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const insertFileRef = (file: FileSuggestion) => {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = newMessage.substring(0, cursorPos);
        const textAfterCursor = newMessage.substring(cursorPos);

        const hashIndex = textBeforeCursor.lastIndexOf('#');
        const newText = textBeforeCursor.substring(0, hashIndex) + `#${file.filePath} ` + textAfterCursor;

        setNewMessage(newText);
        setShowFileDropdown(false);
        setSelectedFileIndex(0);

        // Add to selected files
        if (!selectedFileIds.includes(file.id)) {
            setSelectedFileIds(prev => [...prev, file.id]);
        }

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = textBeforeCursor.substring(0, hashIndex).length + file.filePath.length + 2;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 5);

    const filteredFiles = files.filter((f: any) =>
        f.filePath.toLowerCase().includes(fileSearch.toLowerCase())
    ).slice(0, 5);

    const handlePostMessage = async () => {
        if (!newMessage.trim() || !userId) return;

        await postMessage.mutateAsync({
            repositoryId,
            userId,
            message: newMessage,
            taggedFileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
            taggedBranchIds: selectedBranchIds.length > 0 ? selectedBranchIds : undefined
        });
        setNewMessage('');
        setSelectedFileIds([]);
        setSelectedBranchIds([]);
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!userId) return;
        await deleteMessage.mutateAsync({ messageId, userId, fileId: undefined });
    };

    const toggleBranch = (branchId: string) => {
        setSelectedBranchIds(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const removeFile = (fileId: string) => {
        setSelectedFileIds(prev => prev.filter(id => id !== fileId));
    };

    const getSelectedFiles = () => files.filter((f: any) => selectedFileIds.includes(f.id));
    const getSelectedBranches = () => branches.filter((b: any) => selectedBranchIds.includes(b.id));

    const threadData = thread as DiscussionThread | null;

    return (
        <Card className="bg-card border rounded-lg shadow-sm">
            <CardHeader className="pb-4 bg-muted/50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
                    <div className="p-1.5 rounded-lg bg-accent/10">
                        <MessageSquare className="h-5 w-5 text-accent" />
                    </div>
                    Repository Discussion
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
                            <p className="text-xs mt-1">Use @username to mention, #filename to tag files</p>
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
                                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{parseTextWithFileRefs(msg.message, allFiles, onFileClick, msg.taggedBranchIds)}</p>

                                {/* Tagged Branches and Files */}
                                {(msg.taggedBranches?.length || msg.taggedFiles?.length) && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {msg.taggedBranches?.map((branch) => (
                                            <div key={branch.id} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-blue-500/10 text-blue-500">
                                                <GitBranch className="h-3 w-3" />
                                                <span>{branch.name}</span>
                                            </div>
                                        ))}
                                        {msg.taggedFiles?.map((file) => (
                                            <div
                                                key={file.id}
                                                onClick={() => onFileClick(file, msg.taggedBranchIds)}
                                                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-green-500/10 text-green-500 cursor-pointer hover:bg-green-500/20 transition-colors"
                                            >
                                                <FileIcon className="h-3 w-3" />
                                                <span className="max-w-[120px] truncate">{file.filePath}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Post Message Form */}
                <div className="relative space-y-3 pt-3 border-t">
                    {/* Selected Files/Branches Display */}
                    {(getSelectedFiles().length > 0 || getSelectedBranches().length > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {getSelectedBranches().map((branch: any) => (
                                <div key={branch.id} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <GitBranch className="h-3 w-3" />
                                    <span>{branch.name}</span>
                                    <button onClick={() => toggleBranch(branch.id)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {getSelectedFiles().map((file: any) => (
                                <div key={file.id} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-500 border border-green-500/20">
                                    <FileIcon className="h-3 w-3" />
                                    <span className="max-w-[150px] truncate">{file.filePath}</span>
                                    <button onClick={() => removeFile(file.id)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <Textarea
                        ref={textareaRef}
                        placeholder="Write a message... (@username to mention, #filename to tag files)"
                        value={newMessage}
                        onChange={handleMessageChange}
                        onKeyDown={(e) => {
                            // Handle mention dropdown
                            if (showMentionDropdown && filteredUsers.length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedMentionIndex(prev => prev < filteredUsers.length - 1 ? prev + 1 : 0);
                                    return;
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : filteredUsers.length - 1);
                                    return;
                                } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                                    e.preventDefault();
                                    insertMention(filteredUsers[selectedMentionIndex].username);
                                    return;
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setShowMentionDropdown(false);
                                    return;
                                }
                            }
                            // Handle file dropdown
                            if (showFileDropdown && filteredFiles.length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedFileIndex(prev => prev < filteredFiles.length - 1 ? prev + 1 : 0);
                                    return;
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedFileIndex(prev => prev > 0 ? prev - 1 : filteredFiles.length - 1);
                                    return;
                                } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                                    e.preventDefault();
                                    insertFileRef(filteredFiles[selectedFileIndex]);
                                    return;
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setShowFileDropdown(false);
                                    return;
                                }
                            }
                            // Send message
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

                    {/* #File Dropdown */}
                    {showFileDropdown && filteredFiles.length > 0 && (
                        <div
                            className="absolute z-50 bg-card border rounded-lg shadow-xl max-h-48 overflow-y-auto min-w-[250px]"
                            style={{ top: `${fileDropdownPosition.top}px`, left: `${fileDropdownPosition.left}px` }}
                        >
                            {filteredFiles.map((file: any, index) => (
                                <button
                                    key={file.id}
                                    onClick={() => insertFileRef(file)}
                                    className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${index === selectedFileIndex
                                        ? 'bg-green-500/20 text-green-500'
                                        : 'hover:bg-muted text-foreground'
                                        }`}
                                >
                                    <FileIcon className="h-4 w-4" />
                                    <span className="truncate">{file.filePath}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Branch Selector */}
                    {showBranchSelector && (
                        <div className="border rounded-md p-3 bg-muted/30 max-h-32 overflow-y-auto">
                            <div className="text-sm font-medium mb-2">Select Branches</div>
                            {branches.map((branch: any) => (
                                <label key={branch.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 px-2 rounded text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedBranchIds.includes(branch.id)}
                                        onChange={() => toggleBranch(branch.id)}
                                        className="rounded"
                                    />
                                    <GitBranch className="h-3 w-3" />
                                    <span>{branch.name}</span>
                                    {branch.isDefault && <span className="text-xs text-muted-foreground">(default)</span>}
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={handlePostMessage}
                            disabled={!newMessage.trim() || postMessage.isPending}
                            size="sm"
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Post Message
                        </Button>
                        <Button
                            onClick={() => setShowBranchSelector(!showBranchSelector)}
                            size="sm"
                            variant="outline"
                            className="border text-foreground hover:bg-muted"
                        >
                            <GitBranch className="h-4 w-4 mr-1" />
                            Branches ({selectedBranchIds.length})
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ==========================================
// PERSONAL NOTES SECTION
// ==========================================

function PersonalNotesSection({ repositoryId, userId, onFileClick, files: allFiles }: {
    repositoryId: string;
    userId: string;
    onFileClick: (file: { id: string; filePath: string }, taggedBranchIds?: string[]) => void;
    files: any[];
}) {
    const [newNote, setNewNote] = useState('');
    const [showBranchSelector, setShowBranchSelector] = useState(false);
    const [showFileDropdown, setShowFileDropdown] = useState(false);
    const [fileSearch, setFileSearch] = useState('');
    const [fileDropdownPosition, setFileDropdownPosition] = useState({ top: 0, left: 0 });
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: notes, isLoading } = useRepoPersonalNotes(repositoryId, userId);
    const createNote = useCreateRepoPersonalNote();
    const deleteNote = useDeletePersonalNote();
    const { data: filesData } = useFiles(repositoryId);
    const { data: branchesData } = useBranches(repositoryId);

    const files = (filesData as any[] || []);
    const branches = (branchesData as any[] || []);

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNewNote(value);

        // Check for # file references
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const hashMatch = textBeforeCursor.match(/#([^#\s]*)$/);

        if (hashMatch && hashMatch[1] !== undefined) {
            setFileSearch(hashMatch[1]);
            setShowFileDropdown(true);
            setSelectedFileIndex(0);

            const textarea = e.target;
            const coordinates = getCaretCoordinates(textarea, cursorPos);
            setFileDropdownPosition({ top: coordinates.top + 20, left: coordinates.left });
        } else {
            setShowFileDropdown(false);
            setSelectedFileIndex(0);
        }
    };

    const insertFileRef = (file: FileSuggestion) => {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = newNote.substring(0, cursorPos);
        const textAfterCursor = newNote.substring(cursorPos);

        const hashIndex = textBeforeCursor.lastIndexOf('#');
        const newText = textBeforeCursor.substring(0, hashIndex) + `#${file.filePath} ` + textAfterCursor;

        setNewNote(newText);
        setShowFileDropdown(false);
        setSelectedFileIndex(0);

        // Add to selected files
        if (!selectedFileIds.includes(file.id)) {
            setSelectedFileIds(prev => [...prev, file.id]);
        }

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = textBeforeCursor.substring(0, hashIndex).length + file.filePath.length + 2;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const filteredFiles = files.filter((f: any) =>
        f.filePath.toLowerCase().includes(fileSearch.toLowerCase())
    ).slice(0, 5);

    const handleCreateNote = async () => {
        if (!newNote.trim() || !userId) return;

        await createNote.mutateAsync({
            userId,
            data: {
                repositoryId,
                content: newNote,
                taggedFileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
                taggedBranchIds: selectedBranchIds.length > 0 ? selectedBranchIds : undefined
            }
        });
        setNewNote('');
        setSelectedFileIds([]);
        setSelectedBranchIds([]);
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!userId) return;
        await deleteNote.mutateAsync({ noteId, userId });
    };

    const toggleBranch = (branchId: string) => {
        setSelectedBranchIds(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const removeFile = (fileId: string) => {
        setSelectedFileIds(prev => prev.filter(id => id !== fileId));
    };

    const getSelectedFiles = () => files.filter((f: any) => selectedFileIds.includes(f.id));
    const getSelectedBranches = () => branches.filter((b: any) => selectedBranchIds.includes(b.id));

    interface PersonalNoteData {
        id: string;
        content: string;
        taggedFileIds?: string[];
        taggedFiles?: TaggedFile[];
        taggedBranchIds?: string[];
        taggedBranches?: TaggedBranch[];
        createdAt: string;
    }

    return (
        <Card className="bg-card border rounded-lg shadow-sm">
            <CardHeader className="pb-4 bg-muted/50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
                    <div className="p-1.5 rounded-lg bg-violet-500/10">
                        <User className="h-5 w-5 text-violet-500" />
                    </div>
                    Personal Notes
                    <span className="text-xs bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded">Private</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {/* Create Note Form */}
                <div className="space-y-3">
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            placeholder="Add a personal note... (Enter to save, #filename to tag files)"
                            value={newNote}
                            onChange={handleNoteChange}
                            onKeyDown={(e) => {
                                // Handle file dropdown navigation
                                if (showFileDropdown && filteredFiles.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setSelectedFileIndex(prev =>
                                            prev < filteredFiles.length - 1 ? prev + 1 : 0
                                        );
                                        return;
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setSelectedFileIndex(prev =>
                                            prev > 0 ? prev - 1 : filteredFiles.length - 1
                                        );
                                        return;
                                    } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                                        e.preventDefault();
                                        insertFileRef(filteredFiles[selectedFileIndex]);
                                        return;
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setShowFileDropdown(false);
                                        setSelectedFileIndex(0);
                                        return;
                                    }
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCreateNote();
                                }
                            }}
                            className="min-h-[80px] bg-background border text-foreground placeholder:text-muted-foreground"
                        />

                        {/* #File Dropdown */}
                        {showFileDropdown && filteredFiles.length > 0 && (
                            <div
                                className="absolute z-50 bg-card border rounded-lg shadow-xl max-h-48 overflow-y-auto min-w-[250px]"
                                style={{ top: `${fileDropdownPosition.top}px`, left: `${fileDropdownPosition.left}px` }}
                            >
                                {filteredFiles.map((file: any, index) => (
                                    <button
                                        key={file.id}
                                        onClick={() => insertFileRef(file)}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${index === selectedFileIndex
                                            ? 'bg-green-500/20 text-green-500'
                                            : 'hover:bg-muted text-foreground'
                                            }`}
                                    >
                                        <FileIcon className="h-4 w-4" />
                                        <span className="truncate">{file.filePath}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Files/Branches Display */}
                    {(getSelectedFiles().length > 0 || getSelectedBranches().length > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {getSelectedBranches().map((branch: any) => (
                                <div key={branch.id} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <GitBranch className="h-3 w-3" />
                                    <span>{branch.name}</span>
                                    <button onClick={() => toggleBranch(branch.id)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {getSelectedFiles().map((file: any) => (
                                <div key={file.id} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-500 border border-green-500/20">
                                    <FileIcon className="h-3 w-3" />
                                    <span className="max-w-[150px] truncate">{file.filePath}</span>
                                    <button onClick={() => removeFile(file.id)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={handleCreateNote}
                            disabled={!newNote.trim() || createNote.isPending}
                            size="sm"
                            className="bg-violet-500 hover:bg-violet-600 text-white"
                        >
                            <User className="h-4 w-4 mr-1" />
                            Add Personal Note
                        </Button>
                        <Button
                            onClick={() => setShowBranchSelector(!showBranchSelector)}
                            size="sm"
                            variant="outline"
                            className="border text-foreground hover:bg-muted"
                        >
                            <GitBranch className="h-4 w-4 mr-1" />
                            Tag Branches ({selectedBranchIds.length})
                        </Button>
                    </div>

                    {/* Branch Selector */}
                    {showBranchSelector && (
                        <div className="border rounded-md p-3 bg-muted/30 max-h-48 overflow-y-auto">
                            <div className="text-sm font-medium mb-2">Select Branches</div>
                            {branches.map((branch: any) => (
                                <label key={branch.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 px-2 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedBranchIds.includes(branch.id)}
                                        onChange={() => toggleBranch(branch.id)}
                                        className="rounded"
                                    />
                                    <GitBranch className="h-4 w-4" />
                                    <span className="text-sm">{branch.name}</span>
                                    {branch.isDefault && <span className="text-xs text-muted-foreground">(default)</span>}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notes List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-4 text-muted-foreground">Loading notes...</div>
                    ) : (notes as PersonalNoteData[] || []).length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No personal notes yet. Add the first one!</div>
                    ) : (
                        [...(notes as PersonalNoteData[] || [])]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((note) => (
                                <div key={note.id} className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 group">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-4 w-4 text-violet-500" />
                                            <span className="font-medium text-violet-500">You</span>
                                            <span>•</span>
                                            <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{parseTextWithFileRefs(note.content, allFiles, onFileClick, note.taggedBranchIds)}</p>

                                    {/* Tagged Branches and Files */}
                                    {(note.taggedBranches?.length || note.taggedFiles?.length) && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {note.taggedBranches?.map((branch) => (
                                                <div key={branch.id} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-blue-500/10 text-blue-500">
                                                    <GitBranch className="h-3 w-3" />
                                                    <span>{branch.name}</span>
                                                </div>
                                            ))}
                                            {note.taggedFiles?.map((file) => (
                                                <div
                                                    key={file.id}
                                                    onClick={() => onFileClick(file, note.taggedBranchIds)}
                                                    className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-green-500/10 text-green-500 cursor-pointer hover:bg-green-500/20 transition-colors"
                                                >
                                                    <FileIcon className="h-3 w-3" />
                                                    <span className="max-w-[120px] truncate">{file.filePath}</span>
                                                </div>
                                            ))}
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

// Helper function to parse text and style #filename references
function parseTextWithFileRefs(text: string, files?: any[], onFileClick?: (file: { id: string; filePath: string }, taggedBranchIds?: string[]) => void, taggedBranchIds?: string[]) {
    if (!text) return null;

    const parts: (string | JSX.Element)[] = [];
    const regex = /#([^\s#]+)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const fileName = match[1];
        // Try to find matching file
        const matchingFile = files?.find((f: any) => f.filePath === fileName || f.filePath.endsWith(fileName));

        // Add the styled #filename (clickable if file found and handler provided)
        if (matchingFile && onFileClick) {
            parts.push(
                <span
                    key={key++}
                    onClick={(e) => {
                        e.stopPropagation();
                        onFileClick(matchingFile, taggedBranchIds);
                    }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-medium mx-0.5 cursor-pointer hover:bg-green-500/25 transition-colors"
                >
                    <FileIcon className="h-3 w-3" />
                    {fileName}
                </span>
            );
        } else {
            // Non-clickable if file not found
            parts.push(
                <span
                    key={key++}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-medium mx-0.5"
                >
                    <FileIcon className="h-3 w-3" />
                    {fileName}
                </span>
            );
        }

        lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}


export default RepositoryNotesTab;
