import { BrowserRouter, Routes, Route, useNavigate, Link, useParams, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Code, LogOut, Snowflake, User, Sun, Moon, Monitor, Check, Gem, Waves, Palette, CloudMoon, Zap, Palmtree } from 'lucide-react';
import Snowfall from 'react-snowfall';
import Dashboard from './pages/Dashboard.tsx';
import RepoView from './pages/RepoView.tsx';
import CommitView from './pages/CommitView.tsx';
import PRView from './pages/PRView.tsx';
import PullRequestView from './pages/PullRequestView.tsx';
import FileTreeView from './pages/FileTreeView.tsx';
import FileView from './pages/FileView.tsx';
import Login from './pages/Login.tsx';
import NotificationBell from './components/NotificationBell.tsx';
import { ThemeProvider, useTheme } from './components/theme-provider.tsx';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { api } from './utils/api';

// Capture OAuth code IMMEDIATELY and persist in sessionStorage
// This survives HMR (Hot Module Reload) and page refreshes
const urlParams = new URLSearchParams(window.location.search);
const codeFromUrl = urlParams.get('code');

// If there's a code in URL, save it and clear URL
if (codeFromUrl) {
    sessionStorage.setItem('oauth_code', codeFromUrl);
    window.history.replaceState({}, '', '/');
}

// Get the code from sessionStorage (works even after HMR clears the URL)
const capturedOAuthCode = sessionStorage.getItem('oauth_code');


interface AppContentProps {
    snowfallEnabled: boolean;
    toggleSnowfall: () => void;
}
function RepoRedirect() {
    const { repositoryId } = useParams();
    // Preserve query parameters (like ?tab=notes)
    const query = window.location.search;
    return <Navigate to={`/repo/${repositoryId}${query}`} replace />;
}
// Inner component that can use useNavigate (must be inside BrowserRouter)
function AppContent({ snowfallEnabled, toggleSnowfall }: AppContentProps) {
    const navigate = useNavigate();
    const { resolvedTheme, theme, setTheme } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string>('');
    // Initialize isAuthenticating to true if there's a captured OAuth code
    const [isAuthenticating, setIsAuthenticating] = useState(!!capturedOAuthCode);
    const [isInitialized, setIsInitialized] = useState(false);
    const oauthProcessed = useRef(false);

    useEffect(() => {
        // Use the OAuth code captured at module load (URL is already cleared)
        const code = capturedOAuthCode;

        if (code && !user && !oauthProcessed.current) {
            // Mark as processed IMMEDIATELY to prevent duplicate calls
            oauthProcessed.current = true;
            setIsAuthenticating(true);
            let loginSuccessful = false;
            let loginFailed = false;
            let errorMessage = '';

            api.githubCallback(code)
                .then(data => {
                    if (data && data.user && data.accessToken) {
                        setUser(data.user);
                        setToken(data.accessToken);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('token', data.accessToken);
                        loginSuccessful = true;
                    } else {
                        // Try to recover from localStorage
                        loadFromLocalStorage();
                        loginFailed = true;
                        errorMessage = 'Authentication failed. Please try again.';
                    }
                })
                .catch(err => {
                    console.error('OAuth callback error:', err);
                    // Try to recover from localStorage
                    loadFromLocalStorage();
                    loginFailed = true;
                    errorMessage = err?.message || 'Connection error. Please try again.';
                })
                .finally(() => {
                    // Clear the OAuth code from sessionStorage after processing
                    sessionStorage.removeItem('oauth_code');
                    setIsAuthenticating(false);
                    setIsInitialized(true);
                    // Show success toast after authenticating animation is done
                    if (loginSuccessful) {
                        setTimeout(() => {
                            toast.success('Welcome!', { description: 'You have been successfully logged in.' });
                        }, 100);
                    } else if (loginFailed) {
                        setTimeout(() => {
                            toast.error('Login Failed', { description: errorMessage });
                        }, 100);
                    }
                });
        } else if (!code) {
            loadFromLocalStorage();
            setIsInitialized(true);
        } else {
            setIsInitialized(true);
        }
    }, []);

    const loadFromLocalStorage = () => {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        if (savedUser && savedToken && savedUser !== 'undefined' && savedToken !== 'undefined') {
            try {
                setUser(JSON.parse(savedUser));
                setToken(savedToken);
            } catch (e) {
                // Clear invalid localStorage
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setIsInitialized(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken('');
        toast.success('Logged Out', { description: 'You have been successfully logged out.' });
        navigate('/login');
    };

    // Loading screen component
    const LoadingScreen = ({ message }: { message: string }) => (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );

    return (
        <>
            {/* Modern Header - Only show when logged in */}
            {user && (
                <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container-custom flex h-16 items-center justify-between">
                        {/* Logo - using Link for smooth navigation */}
                        <Link
                            to="/"
                            className="flex items-center gap-2 transition-transform hover:scale-105 focus:outline-none rounded-md"
                        >
                            <Code className="h-6 w-6 text-primary" />
                            <span className="font-heading text-xl font-bold text-foreground">
                                ForeSite
                            </span>
                        </Link>

                        {/* Notifications + Profile Dropdown */}
                        <div className="flex items-center gap-3">
                            {user && <NotificationBell />}

                            {user ? (
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <button className="rounded-full focus:outline-none focus-visible:outline-none">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.username}
                                                    className="w-9 h-9 rounded-full border-2 border-primary hover:border-primary/80 transition-all cursor-pointer"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full border-2 border-primary bg-muted flex items-center justify-center cursor-pointer">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 z-50">
                                        {/* Profile Info */}
                                        <DropdownMenuLabel className="flex items-center gap-2">
                                            {user.avatarUrl && (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.username}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.username}</span>
                                                <span className="text-xs text-muted-foreground">Signed in</span>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        {/* Theme Options */}
                                        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                                            Theme
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => setTheme("light")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Sun className="h-4 w-4 mr-2" />
                                            <span>Light</span>
                                            {theme === "light" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("dark")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Moon className="h-4 w-4 mr-2" />
                                            <span>Dark</span>
                                            {theme === "dark" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("night")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Moon className="h-4 w-4 mr-2 fill-current" />
                                            <span>Night</span>
                                            {theme === "night" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("amethyst")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Gem className="mr-2 h-4 w-4" />
                                            <span>Amethyst</span>
                                            {theme === "amethyst" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("oceanic")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Waves className="mr-2 h-4 w-4" />
                                            <span>Oceanic</span>
                                            {theme === "oceanic" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("pastel")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Palette className="mr-2 h-4 w-4" />
                                            <span>Pastel</span>
                                            {theme === "pastel" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("twilight")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <CloudMoon className="mr-2 h-4 w-4" />
                                            <span>Twilight</span>
                                            {theme === "twilight" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("neon")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Zap className="mr-2 h-4 w-4" />
                                            <span>Neon</span>
                                            {theme === "neon" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("tropical")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Palmtree className="mr-2 h-4 w-4" />
                                            <span>Tropical</span>
                                            {theme === "tropical" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTheme("system")} className={`cursor-pointer ${resolvedTheme === 'light' ? 'focus:text-blue-700' : ''}`}>
                                            <Monitor className="h-4 w-4 mr-2" />
                                            <span>System</span>
                                            {theme === "system" && <Check className="h-4 w-4 ml-auto" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />

                                        {/* Snowfall Toggle */}
                                        <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between w-full" onClick={toggleSnowfall}>
                                                <div className="flex items-center gap-2">
                                                    <Snowflake className="h-4 w-4" />
                                                    <span>Snowfall Effect</span>
                                                </div>
                                                <div className={`w-8 h-4 rounded-full transition-colors ${snowfallEnabled ? 'bg-primary' : 'bg-muted'}`}>
                                                    <div className={`w-3 h-3 rounded-full bg-white shadow transform transition-transform mt-0.5 ${snowfallEnabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />

                                        {/* Logout */}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem
                                                    onSelect={(e) => e.preventDefault()}
                                                    className={`cursor-pointer ${resolvedTheme === 'light'
                                                        ? 'text-red-600 focus:bg-red-100 focus:text-red-700'
                                                        : 'text-red-400 focus:bg-red-900/40 focus:text-red-300'
                                                        }`}
                                                >
                                                    <LogOut className="h-4 w-4 mr-2" />
                                                    <span>Log out</span>
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to log out?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className={resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={handleLogout}
                                                        className="bg-red-600 text-white hover:bg-red-700"
                                                    >
                                                        Log Out
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Link
                                    to="/login"
                                    className="font-medium text-sm text-foreground hover:underline"
                                >
                                </Link>
                            )}
                        </div>
                    </div>
                </header>
            )}

            {/* Routes with fade-in animation */}
            <main className="animate-fade-in">
                <Routes>
                    <Route path="/" element={
                        (() => {
                            if (isAuthenticating) {
                                return <LoadingScreen message="Authenticating..." />;
                            }

                            if (!isInitialized) {
                                return <LoadingScreen message="Loading..." />;
                            }

                            return user ? <Dashboard user={user} token={token} /> : <Login snowfallEnabled={snowfallEnabled} toggleSnowfall={toggleSnowfall} />;
                        })()
                    } />
                    <Route path="/login" element={<Login snowfallEnabled={snowfallEnabled} toggleSnowfall={toggleSnowfall} />} />
                    <Route path="/repository/:repositoryId" element={<RepoRedirect />} />
                    <Route path="/repo/:repositoryId" element={user ? <RepoView user={user} /> : <Login snowfallEnabled={snowfallEnabled} toggleSnowfall={toggleSnowfall} />} />
                    <Route path="/commit/:commitId" element={<CommitView />} />
                    <Route path="/pr/:prId" element={<PRView />} />
                    <Route path="/pr/:owner/:repo/:prNumber" element={user ? <PullRequestView user={user} /> : <Login snowfallEnabled={snowfallEnabled} toggleSnowfall={toggleSnowfall} />} />
                    <Route path="/file/:fileId" element={<FileView />} />
                    <Route path="/filetree/:fileId" element={<FileTreeView />} />
                </Routes>
            </main>
        </>
    );
}

function App() {
    // Snowfall state - persisted in localStorage, default to true (on)
    const [snowfallEnabled, setSnowfallEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('snowfall-enabled');
        return saved !== null ? saved === 'true' : true;
    });

    const toggleSnowfall = () => {
        setSnowfallEnabled(prev => {
            const newValue = !prev;
            localStorage.setItem('snowfall-enabled', String(newValue));
            return newValue;
        });
    };

    return (
        <ThemeProvider defaultTheme="night">
            {snowfallEnabled && (
                <Snowfall
                    snowflakeCount={200}
                    speed={[0.5, 3.0]}
                    wind={[-0.5, 2.0]}
                    radius={[0.5, 3.0]}
                    style={{
                        position: 'fixed',
                        width: '100vw',
                        height: '100vh',
                        zIndex: 9999,
                        pointerEvents: 'none'
                    }}
                />
            )}
            <BrowserRouter>
                <AppContent snowfallEnabled={snowfallEnabled} toggleSnowfall={toggleSnowfall} />
            </BrowserRouter>
            <Toaster richColors position="top-center" />
        </ThemeProvider>
    );
}

export default App;
