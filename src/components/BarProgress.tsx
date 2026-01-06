interface BarProgressProps {
    value: number;
    max?: number;
    maxValue?: number; // Alias for max
    label?: string;
    color?: string;
    showPercentage?: boolean;
}

export default function BarProgress({
    value,
    max,
    maxValue,
    label,
    color = 'hsl(var(--primary))',
    showPercentage = true
}: BarProgressProps) {
    const maxVal = maxValue || max || 100;
    const percentage = Math.min(100, Math.max(0, (value / maxVal) * 100));

    return (
        <div className="space-y-2">
            {(label || showPercentage) && (
                <div className="flex items-center justify-between text-sm">
                    {label && <span className="text-muted-foreground">{label}</span>}
                    {showPercentage && <span className="font-medium">{Math.round(percentage)}%</span>}
                </div>
            )}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full transition-all duration-300 ease-in-out rounded-full"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color
                    }}
                />
            </div>
        </div>
    );
}
