import { Sun, Moon, Monitor, Gem, Waves, Palette, CloudMoon, Zap, Palmtree } from "lucide-react";
import { useTheme } from "./theme-provider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function ThemeSelector() {
    const { theme, resolvedTheme, setTheme } = useTheme();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className={resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}>
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="z-50">
                <DropdownMenuItem onSelect={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                    {theme === "light" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                    {theme === "dark" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("night")}>
                    <Moon className="mr-2 h-4 w-4 fill-current" />
                    <span>Night</span>
                    {theme === "night" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("amethyst")}>
                    <Gem className="mr-2 h-4 w-4" />
                    <span>Amethyst</span>
                    {theme === "amethyst" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("oceanic")}>
                    <Waves className="mr-2 h-4 w-4" />
                    <span>Oceanic</span>
                    {theme === "oceanic" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("pastel")}>
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Pastel</span>
                    {theme === "pastel" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("twilight")}>
                    <CloudMoon className="mr-2 h-4 w-4" />
                    <span>Twilight</span>
                    {theme === "twilight" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("neon")}>
                    <Zap className="mr-2 h-4 w-4" />
                    <span>Neon</span>
                    {theme === "neon" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("tropical")}>
                    <Palmtree className="mr-2 h-4 w-4" />
                    <span>Tropical</span>
                    {theme === "tropical" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("system")}>
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                    {theme === "system" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
