import { Button } from '@/components/ui/button';
import { GitBranch, FileIcon, X } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface BranchSelectorModalProps {
    open: boolean;
    onClose: () => void;
    fileName: string;
    branches: string[];
    defaultBranch?: string;
    onSelectBranch: (branch: string) => void;
}

export function BranchSelectorModal({
    open,
    onClose,
    fileName,
    branches,
    defaultBranch,
    onSelectBranch
}: BranchSelectorModalProps) {
    if (!open) return null;

    const { resolvedTheme } = useTheme();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-card border rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <FileIcon className="h-5 w-5 text-green-500" />
                                <h2 className="text-lg font-semibold">Select Branch for {fileName}</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                This file is not available in the default branch. Select which branch to view:
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-2">
                    {branches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>This file doesn't exist in any branch.</p>
                        </div>
                    ) : (
                        branches.map((branch) => {
                            const isDefault = branch === defaultBranch;
                            return (
                                <Button
                                    key={branch}
                                    onClick={() => {
                                        onSelectBranch(branch);
                                        onClose();
                                    }}
                                    variant={isDefault ? "default" : "outline"}
                                    className={`w-full justify-start gap-2 ${!isDefault && (resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : '')}`}
                                >
                                    <GitBranch className="h-4 w-4" />
                                    <span>{branch}</span>
                                    {isDefault && (
                                        <span className="ml-auto text-xs bg-primary-foreground/20 px-2 py-0.5 rounded">
                                            default
                                        </span>
                                    )}
                                </Button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
