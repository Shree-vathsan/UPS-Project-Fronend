import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

interface SnowfallToggleProps {
    isActive: boolean;
    onToggle: () => void;
}

export default function SnowfallToggle({ isActive, onToggle }: SnowfallToggleProps) {
    const { resolvedTheme } = useTheme();

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={onToggle}
            className={`relative ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
            title={`Snowfall Effect - ${isActive ? 'On' : 'Off'}`}
        >
            <Snowflake
                className={`h-[1.2rem] w-[1.2rem] transition-all ${isActive ? 'text-green-500' : 'text-red-500'
                    }`}
            />
            <span className="sr-only">Snowfall Effect</span>
        </Button>
    );
}
