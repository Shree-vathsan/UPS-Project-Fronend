import { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface InfoTooltipProps {
    text: string;
    formula?: string;
    icon?: ReactNode;
}

export default function InfoTooltip({ text, formula, icon }: InfoTooltipProps) {
    return (
        <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
                <button className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    {icon || <Info className="h-4 w-4" />}
                </button>
            </HoverCardTrigger>
            <HoverCardContent side="left" className="max-w-xs">
                <p className="text-sm">{text}</p>
                {formula && (
                    <code className="block mt-2 text-xs bg-muted p-2 rounded font-mono">
                        {formula}
                    </code>
                )}
            </HoverCardContent>
        </HoverCard>
    );
}
