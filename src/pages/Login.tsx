import { useState } from 'react';
import { Github, Code, AlertTriangle, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '../utils/api';
import ThemeSelector from '../components/ThemeSelector';
import SnowfallToggle from '../components/SnowfallToggle';
import { useTheme } from '../components/theme-provider';

interface LoginProps {
    snowfallEnabled?: boolean;
    toggleSnowfall?: () => void;
}

export default function Login({ snowfallEnabled = false, toggleSnowfall = () => { } }: LoginProps) {
    const [error, setError] = useState<string>('');
    const { resolvedTheme } = useTheme();

    const handleLogin = async () => {
        try {
            const result = await api.githubLogin(window.location.origin);
            if (result && result.url) {
                window.location.href = result.url;
            } else {
                setError('Failed to get OAuth URL from backend');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Backend is not responding. Make sure the backend is running on port 5000.');
        }
    };

    // Handle opening/downloading the user manual PDF
    const handleOpenUserManual = () => {
        // Using a sample PDF URL - replace with your actual user manual PDF path
        const pdfUrl = '/user-manual.pdf';
        window.open(pdfUrl, '_blank');
    };

    return (
        <div className="h-screen overflow-hidden flex items-center justify-center bg-background relative">
            {/* Theme Selector & Snowfall Toggle - Top Right */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
                <SnowfallToggle isActive={snowfallEnabled} onToggle={toggleSnowfall} />
                <ThemeSelector />
            </div>

            <div className="w-full -mt-16 max-w-md px-4 animate-fade-in">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Code className="h-10 w-10 text-primary" />
                        <h1 className="font-heading text-4xl font-bold text-foreground">
                            ForeSite
                        </h1>
                    </div>

                </div>

                {/* Login Card */}
                <Card className="-mt-4">
                    <CardHeader>
                        {/* <CardTitle>Login</CardTitle> */}
                        <CardDescription className="text-center">
                            Sign in with your GitHub account to continue
                        </CardDescription>

                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Authentication Error</AlertTitle>
                                <AlertDescription>
                                    {error}
                                    <div className="mt-3 text-xs bg-background/50 p-3 rounded-md border border-border">
                                        <strong className="block mb-2">Troubleshooting:</strong>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Make sure backend is running: <code>dotnet run</code></li>
                                            <li>Backend should be at: https://codefamily-backend-854884449726.us-central1.run.app</li>
                                            <li>Supabase database must be configured</li>
                                        </ul>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            onClick={handleLogin}
                            className="w-full gap-2"
                            size="lg"
                        >
                            <Github className="h-5 w-5" />
                            Login with GitHub
                        </Button>
                        <CardDescription className="text-center">
                            Know about us
                        </CardDescription>
                        <Button
                            onClick={handleOpenUserManual}
                            variant="outline"
                            className={`w-full gap-2 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
                            size="lg"
                        >
                            <Files className="h-5 w-5" />
                            User Manual
                        </Button>

                        {/* <div className="bg-muted/50 p-4 rounded-md border border-border">
                            <div className="text-sm font-medium text-foreground mb-2">
                                System Status
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Frontend: Running</span>
                                </div>
                                <div className={`flex items-center gap-2 ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {error ? <AlertTriangle className="h-4 w-4" /> : <span className="h-4 w-4">...</span>}
                                    <span>Backend: {error ? 'Not responding' : 'Checking...'}</span>
                                </div>
                            </div>
                        </div> */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
