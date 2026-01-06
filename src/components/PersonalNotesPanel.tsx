import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BookMarked, Plus, Trash2, Edit2, X, Check, Hash, Users, Search, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    useFilePersonalNotes, useCreateFilePersonalNote, useUpdatePersonalNote, useDeletePersonalNote,
    useLineCommentsForFile, useCreateLineComment
} from '@/hooks/useApiQueries';
import { formatDistanceToNow } from 'date-fns';

interface PersonalNotesPanelProps {
    fileId: string;
    repositoryId?: string;
    totalLines?: number;
    onLineClick?: (lineNumber: number) => void;
}

interface PersonalNote {
    id: string;
    content: string;
    lineNumber?: number;
    createdAt: string;
    updatedAt: string;
}

interface SharedNote {
    id: string;
    commentText: string;
    lineNumber?: number;
    createdAt: string;
    createdByUserId: string;
    createdByUsername: string;
    isShared: boolean;
}

// ============================================
// MAIN PANEL - Renders both sections
// ============================================

export function PersonalNotesPanel({ fileId, repositoryId, totalLines, onLineClick }: PersonalNotesPanelProps) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;

    return (
        <div className="space-y-4 w-full">
            {/* Section 1: Personal Notes - Top */}
            <PersonalNotesSection
                fileId={fileId}
                userId={userId}
                totalLines={totalLines}
                onLineClick={onLineClick}
            />

            {/* Section 2: Shared Notes - Bottom */}
            <SharedNotesSection
                fileId={fileId}
                repositoryId={repositoryId}
                userId={userId}
                totalLines={totalLines}
                onLineClick={onLineClick}
            />
        </div>
    );
}

// ============================================
// PERSONAL NOTES SECTION - Completely Independent
// ============================================

function PersonalNotesSection({
    fileId,
    userId,
    totalLines,
    onLineClick
}: {
    fileId: string;
    userId: string;
    totalLines?: number;
    onLineClick?: (lineNumber: number) => void;
}) {
    // Independent state for Personal Notes
    const [isAdding, setIsAdding] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchLineNumber, setSearchLineNumber] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newLineNumber, setNewLineNumber] = useState('');
    const [lineNumberError, setLineNumberError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editLineNumber, setEditLineNumber] = useState('');

    // Ref for textarea to focus after line number entry
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Personal notes data hooks
    const { data: notes, isLoading } = useFilePersonalNotes(fileId, userId);
    const createNote = useCreateFilePersonalNote();
    const updateNote = useUpdatePersonalNote();
    const deleteNote = useDeletePersonalNote();

    const notesData = (notes as PersonalNote[] || []);

    // Filter notes by line number search - PREFIX MATCH (like phone search)
    const filteredNotes = useMemo(() => {
        let filtered = notesData;

        if (searchLineNumber.trim()) {
            // Prefix match: line number must START WITH the search string
            filtered = notesData.filter(note => {
                if (!note.lineNumber) return false;
                // Convert line number to string and check if it starts with the search string
                return note.lineNumber.toString().startsWith(searchLineNumber.trim());
            });
        }

        // Sort by createdAt descending (most recent first)
        return [...filtered].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [notesData, searchLineNumber]);

    // Create personal note with mandatory line number
    const handleCreate = async () => {
        if (!newContent.trim() || !userId) return;

        // Validate mandatory line number
        if (!newLineNumber.trim()) {
            setLineNumberError('Line number is required');
            return;
        }

        const lineNum = parseInt(newLineNumber);
        if (isNaN(lineNum) || lineNum < 1) {
            setLineNumberError('Please enter a valid line number');
            return;
        }

        await createNote.mutateAsync({
            userId,
            data: {
                fileId,
                content: newContent,
                lineNumber: lineNum
            }
        });

        setNewContent('');
        setNewLineNumber('');
        setLineNumberError('');
        setIsAdding(false);
    };

    const handleStartEdit = (note: PersonalNote) => {
        setEditingId(note.id);
        setEditContent(note.content);
        setEditLineNumber(note.lineNumber?.toString() || '');
    };

    const handleSaveEdit = async () => {
        if (!editContent.trim() || !editingId || !userId) return;

        await updateNote.mutateAsync({
            noteId: editingId,
            userId,
            data: {
                content: editContent,
                lineNumber: editLineNumber ? parseInt(editLineNumber) : undefined
            },
            fileId
        });
        setEditingId(null);
        setEditContent('');
        setEditLineNumber('');
    };

    const handleDelete = async (noteId: string) => {
        if (!userId) return;
        await deleteNote.mutateAsync({ noteId, userId, fileId });
    };

    const handleCancelAdd = () => {
        setIsAdding(false);
        setNewContent('');
        setNewLineNumber('');
        setLineNumberError('');
    };

    return (
        <Card className="w-full bg-card border rounded-lg shadow-sm">
            <CardHeader className="pb-3 bg-muted/50 border-b">
                <CardTitle className="flex items-center justify-between text-base text-card-foreground">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <BookMarked className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold tracking-tight">Personal Notes</span>
                        <span className="text-xs text-muted-foreground">({notesData.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Search Toggle */}
                        <Button
                            onClick={() => {
                                setIsSearching(!isSearching);
                                if (isSearching) setSearchLineNumber('');
                            }}
                            size="sm"
                            variant="ghost"
                            className={`h-8 w-8 p-0 ${isSearching ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'}`}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                        {/* Add Note Button */}
                        {!isAdding && (
                            <Button
                                onClick={() => setIsAdding(true)}
                                size="sm"
                                className="h-8 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Note
                            </Button>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
                {/* Search Input - with smooth open/close animation */}
                <div
                    className={`grid transition-all duration-300 ${isSearching
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                            <Hash className="h-4 w-4 text-primary" />
                            <Input
                                type="text"
                                placeholder="Search by line number (e.g., 3 shows L3, L30, L31...)"
                                value={searchLineNumber}
                                onChange={(e) => setSearchLineNumber(e.target.value)}
                                className="flex-1 h-7 bg-transparent border-0 text-foreground text-sm focus:ring-0 placeholder:text-muted-foreground"
                                autoFocus={isSearching}
                            />
                            {searchLineNumber && (
                                <Button
                                    onClick={() => setSearchLineNumber('')}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Note Form - with smooth open/close animation */}
                <div
                    className={`grid transition-all duration-300 ${isAdding
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                            {/* Line Number Field - First */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-muted">
                                        <Hash className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder={totalLines ? `Line # (1-${totalLines})` : "Line # (required)"}
                                        value={newLineNumber}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setNewLineNumber(value);
                                            const lineNum = parseInt(value);
                                            if (totalLines && totalLines > 0 && lineNum > totalLines) {
                                                setLineNumberError(`Line number exceeds file length (max: ${totalLines})`);
                                            } else if (lineNum < 1 && value) {
                                                setLineNumberError('Line number must be at least 1');
                                            } else {
                                                setLineNumberError('');
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                textareaRef.current?.focus();
                                            }
                                        }}
                                        className={`flex-1 h-8 bg-background text-foreground text-sm rounded-lg ${lineNumberError ? 'border-destructive' : 'border'}`}
                                        autoFocus={isAdding}
                                    />
                                </div>
                                {lineNumberError && (
                                    <p className="text-xs text-destructive ml-9">{lineNumberError}</p>
                                )}
                            </div>
                            {/* Notes Textarea - Second */}
                            <Textarea
                                ref={textareaRef}
                                placeholder="Write your private note... (Enter to save, Shift+Enter for new line)"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleCreate();
                                    }
                                }}
                                className="min-h-[70px] bg-background border text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-primary/20 rounded-lg"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    onClick={handleCancelAdd}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-3 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={!newContent.trim() || createNote.isPending || !!lineNumberError || !newLineNumber.trim()}
                                    size="sm"
                                    className="h-7 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-200"
                                >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {isLoading ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                            <div className="animate-pulse">Loading...</div>
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                                <BookMarked className="h-6 w-6 text-muted-foreground" />
                            </div>
                            {searchLineNumber ? (
                                <p>No notes found matching line "{searchLineNumber}"</p>
                            ) : (
                                <>
                                    <p>No personal notes yet.</p>
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="text-primary hover:text-primary/80 mt-2 font-medium transition-colors"
                                    >
                                        Add your first note
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className={`p-3 rounded-lg bg-muted/30 border transition-all duration-200 hover:shadow-sm group ${searchLineNumber && note.lineNumber?.toString().startsWith(searchLineNumber.trim())
                                    ? 'border-primary/50 ring-1 ring-primary/20'
                                    : 'hover:border-primary/30'
                                    }`}
                            >
                                {editingId === note.id ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="min-h-[50px] bg-background border text-foreground text-sm rounded-lg"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Hash className="h-3 w-3 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                placeholder="Line #"
                                                value={editLineNumber}
                                                onChange={(e) => setEditLineNumber(e.target.value)}
                                                className="flex-1 h-6 bg-background border text-foreground text-xs rounded-lg"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                onClick={() => setEditingId(null)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-xs text-muted-foreground"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleSaveEdit}
                                                disabled={!editContent.trim() || updateNote.isPending}
                                                size="sm"
                                                className="h-6 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-1">
                                            {note.lineNumber && (
                                                <button
                                                    onClick={() => onLineClick?.(note.lineNumber!)}
                                                    className="px-2 py-0.5 text-xs rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-mono"
                                                >
                                                    L{note.lineNumber}
                                                </button>
                                            )}
                                            <div className="flex-1" />
                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleStartEdit(note)}
                                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(note.id)}
                                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                                        </p>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================
// SHARED NOTES SECTION - Completely Independent
// ============================================

function SharedNotesSection({
    fileId,
    repositoryId,
    userId,
    totalLines,
    onLineClick
}: {
    fileId: string;
    repositoryId?: string;
    userId: string;
    totalLines?: number;
    onLineClick?: (lineNumber: number) => void;
}) {
    // Independent state for Shared Notes
    const [filter, setFilter] = useState<'all' | 'you' | 'others'>('all');
    const [isAdding, setIsAdding] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchLineNumber, setSearchLineNumber] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newLineNumber, setNewLineNumber] = useState('');
    const [lineNumberError, setLineNumberError] = useState('');

    // Ref for textarea to focus after line number entry
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Shared notes data hooks
    const { data: lineComments, isLoading } = useLineCommentsForFile(fileId, userId);
    const createLineComment = useCreateLineComment();

    const sharedNotesData = (lineComments || []).filter((comment: any) => comment.isShared) as SharedNote[];

    // Filter and sort shared notes
    const filteredAndSortedNotes = useMemo(() => {
        let filtered = sharedNotesData;

        // Apply All/You/Others filter
        if (filter === 'you') {
            filtered = sharedNotesData.filter(note => note.createdByUserId === userId);
        } else if (filter === 'others') {
            filtered = sharedNotesData.filter(note => note.createdByUserId !== userId);
        }
        // 'all' shows everything

        // Apply line number search filter (prefix match - like phone search)
        if (searchLineNumber.trim()) {
            filtered = filtered.filter(note => {
                if (!note.lineNumber) return false;
                return note.lineNumber.toString().startsWith(searchLineNumber.trim());
            });
        }

        // Sort by createdAt descending (most recent first)
        return [...filtered].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [sharedNotesData, filter, userId, searchLineNumber]);

    // Create shared note
    const handleCreate = async () => {
        if (!newContent.trim() || !userId || !repositoryId) return;

        // Validate mandatory line number
        if (!newLineNumber.trim()) {
            setLineNumberError('Line number is required');
            return;
        }

        const lineNum = parseInt(newLineNumber);
        if (isNaN(lineNum) || lineNum < 1) {
            setLineNumberError('Please enter a valid line number');
            return;
        }

        await createLineComment.mutateAsync({
            userId,
            data: {
                repositoryId,
                fileId,
                lineNumber: lineNum,
                commentText: newContent,
                isShared: true
            }
        });

        setNewContent('');
        setNewLineNumber('');
        setLineNumberError('');
        setIsAdding(false);
    };

    const handleCancelAdd = () => {
        setIsAdding(false);
        setNewContent('');
        setNewLineNumber('');
        setLineNumberError('');
    };

    return (
        <Card className="w-full bg-card border rounded-lg shadow-sm">
            <CardHeader className="pb-3 bg-muted/50 border-b">
                <CardTitle className="flex items-center justify-between text-base text-card-foreground">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-accent/10">
                            <Users className="h-4 w-4 text-accent" />
                        </div>
                        <span className="font-semibold tracking-tight">Shared Notes</span>
                        <span className="text-xs text-muted-foreground">({sharedNotesData.length})</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Search Toggle */}
                        <Button
                            onClick={() => {
                                setIsSearching(!isSearching);
                                if (isSearching) setSearchLineNumber('');
                            }}
                            size="sm"
                            variant="ghost"
                            className={`h-8 w-8 p-0 ${isSearching ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:text-accent'}`}
                        >
                            <Search className="h-4 w-4" />
                        </Button>

                        {/* Filter Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                                    {filter === 'all' ? 'All' : filter === 'you' ? 'You' : 'Others'}
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilter('all')}>
                                    All
                                    {filter === 'all' && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilter('you')}>
                                    You
                                    {filter === 'you' && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilter('others')}>
                                    Others
                                    {filter === 'others' && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Add Note Button */}
                        {!isAdding && (
                            <Button
                                onClick={() => setIsAdding(true)}
                                size="sm"
                                className="h-8 px-3 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 hover:border-accent/50 transition-all duration-200"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Note
                            </Button>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
                {/* Search Input - with smooth open/close animation */}
                <div
                    className={`grid transition-all duration-300 ${isSearching
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                            <Hash className="h-4 w-4 text-accent" />
                            <Input
                                type="text"
                                placeholder="Search by line number (e.g., 3 shows L3, L30, L31...)"
                                value={searchLineNumber}
                                onChange={(e) => setSearchLineNumber(e.target.value)}
                                className="flex-1 h-7 bg-transparent border-0 text-foreground text-sm focus:ring-0 placeholder:text-muted-foreground"
                                autoFocus={isSearching}
                            />
                            {searchLineNumber && (
                                <Button
                                    onClick={() => setSearchLineNumber('')}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Shared Note Form - with smooth open/close animation */}
                <div
                    className={`grid transition-all duration-300 ${isAdding
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 space-y-3">
                            {/* Line Number Field - First */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-muted">
                                        <Hash className="h-3.5 w-3.5 text-accent" />
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder={totalLines ? `Line # (1-${totalLines})` : "Line # (required)"}
                                        value={newLineNumber}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setNewLineNumber(value);
                                            const lineNum = parseInt(value);
                                            if (totalLines && totalLines > 0 && lineNum > totalLines) {
                                                setLineNumberError(`Line number exceeds file length (max: ${totalLines})`);
                                            } else if (lineNum < 1 && value) {
                                                setLineNumberError('Line number must be at least 1');
                                            } else {
                                                setLineNumberError('');
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                textareaRef.current?.focus();
                                            }
                                        }}
                                        className={`flex-1 h-8 bg-background text-foreground text-sm rounded-lg ${lineNumberError ? 'border-destructive' : 'border'}`}
                                        autoFocus={isAdding}
                                    />
                                </div>
                                {lineNumberError && (
                                    <p className="text-xs text-destructive ml-9">{lineNumberError}</p>
                                )}
                            </div>
                            {/* Notes Textarea - Second */}
                            <Textarea
                                ref={textareaRef}
                                placeholder="Share a note with your team... (Enter to share, Shift+Enter for new line)"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleCreate();
                                    }
                                }}
                                className="min-h-[70px] bg-background border text-foreground placeholder:text-muted-foreground text-sm focus:border-accent focus:ring-accent/20 rounded-lg"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    onClick={handleCancelAdd}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-3 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={!newContent.trim() || createLineComment.isPending || !!lineNumberError || !newLineNumber.trim()}
                                    size="sm"
                                    className="h-7 px-4 bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm transition-all duration-200"
                                >
                                    <Check className="h-3 w-3 mr-1" />
                                    Share
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shared Notes List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {isLoading ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                            <div className="animate-pulse">Loading...</div>
                        </div>
                    ) : filteredAndSortedNotes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                                <Users className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p>
                                {searchLineNumber
                                    ? `No notes found matching line "${searchLineNumber}"`
                                    : filter === 'all' && 'No shared notes yet.'}
                                {!searchLineNumber && filter === 'you' && 'You haven\'t shared any notes yet.'}
                                {!searchLineNumber && filter === 'others' && 'No notes from others yet.'}
                            </p>
                            {!searchLineNumber && filter !== 'others' && (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="text-accent hover:text-accent/80 mt-2 font-medium transition-colors"
                                >
                                    Share your first note
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredAndSortedNotes.map((note) => {
                            const isMyNote = note.createdByUserId === userId;
                            const matchesSearch = searchLineNumber && note.lineNumber?.toString().startsWith(searchLineNumber.trim());

                            return (
                                <div
                                    key={note.id}
                                    className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${matchesSearch ? 'ring-1 ring-accent/20' : ''} ${isMyNote
                                        ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                                        : 'bg-muted/30 hover:border-accent/30'
                                        }`}
                                >
                                    {/* Header with author and line number */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {/* Author badge */}
                                            {isMyNote ? (
                                                <Badge variant="default" className="text-xs bg-primary text-primary-foreground border-0 shadow-sm">
                                                    You
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-accent/30">
                                                    {note.createdByUsername}
                                                </Badge>
                                            )}

                                            {/* Line number */}
                                            {note.lineNumber && note.lineNumber > 0 && (
                                                <button
                                                    onClick={() => onLineClick?.(note.lineNumber!)}
                                                    className="px-2 py-0.5 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors font-mono"
                                                >
                                                    L{note.lineNumber}
                                                </button>
                                            )}
                                        </div>

                                        {/* Timestamp */}
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>

                                    {/* Message content */}
                                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                        {note.commentText}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default PersonalNotesPanel;
