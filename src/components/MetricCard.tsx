import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Info } from 'lucide-react';

interface MetricCardProps {
    icon: ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    trend?: number;
    tooltip?: string;
    formula?: string;
}

export default function MetricCard({
    icon,
    title,
    value,
    subtitle,
    color = 'hsl(var(--primary))',
    trend,
    tooltip,
    formula
}: MetricCardProps) {
    return (
        <Card className="relative overflow-hidden">
            {/* Background Icon */}
            <div className="absolute -top-6 -right-6 text-8xl opacity-5 pointer-events-none">
                {icon}
            </div>

            <CardContent className="p-6 relative">
                {/* HoverCard */}
                {tooltip && (
                    <div className="absolute top-3 right-3">
                        <HoverCard openDelay={100} closeDelay={100}>
                            <HoverCardTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Info className="h-4 w-4" />
                                </button>
                            </HoverCardTrigger>
                            <HoverCardContent side="left" className="max-w-xs">
                                <p className="text-sm">{tooltip}</p>
                                {formula && (
                                    <code className="block mt-2 text-xs bg-muted p-2 rounded">
                                        {formula}
                                    </code>
                                )}
                            </HoverCardContent>
                        </HoverCard>
                    </div>
                )}

                {/* Content */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {title}
                    </p>
                    <p className="text-3xl font-bold" style={{ color }}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                    {trend !== undefined && trend !== 0 && (
                        <div className={`text-xs font-semibold ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {/* {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}% from last week */}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
