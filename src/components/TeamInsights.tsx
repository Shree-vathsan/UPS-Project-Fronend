import { useMemo } from 'react';
import {
    BarChart, Bar, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Users, CheckCircle, BarChart as BarChartIcon, Calendar, Handshake, Trophy, Sparkles, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import InfoTooltip from './InfoTooltip';
import { useTeamInsights } from '../hooks/useApiQueries';

interface TeamInsightsProps {
    repositoryId: string;
    branchName: string;
}

export default function TeamInsights({ repositoryId, branchName }: TeamInsightsProps) {
    // React Query hook for data fetching with caching
    const { data: teamData, isLoading: loading } = useTeamInsights(repositoryId, branchName);

    // Process data with useMemo for performance
    const { contributors, metrics } = useMemo(() => {
        if (!teamData) {
            return { contributors: [], ownershipData: [], metrics: null };
        }

        const contributors = teamData.contributors || [];
        const metrics = {
            totalContributors: teamData.totalContributors || 0,
            activeContributors: teamData.activeContributors || 0,
            avgCommitsPerContributor: teamData.avgCommitsPerContributor || '0',
            mostActiveDay: teamData.mostActiveDay || 'N/A',
            collaborationScore: Math.min(100, (teamData.totalContributors || 0) * 15)
        };

        return { contributors, metrics };
    }, [teamData]);

    // Theme-aware colors (will work with all themes)
    const COLORS = [
        'hsl(var(--primary))',
        'hsl(var(--accent))',
        'hsl(var(--secondary))',
        'hsl(154 14 50)', // muted-teal
        'hsl(27 62 50)', // sandy-clay
        'hsl(27 57 50)', // desert-sand
        'hsl(262 83 58)', // purple
        'hsl(0 70 50)', // red accent
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Metrics Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
                {/* Charts Skeleton */}
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Team Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Total Committed Contributors</div>
                            <div className="text-3xl font-bold text-primary">
                                {metrics?.totalContributors || 0}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-accent" />
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Active (7d)</div>
                            <div className="text-3xl font-bold text-accent">
                                {metrics?.activeContributors || 0}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3">
                        <BarChartIcon className="h-8 w-8 text-secondary" />
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Avg Commits</div>
                            <div className="text-3xl font-bold text-secondary">
                                {metrics?.avgCommitsPerContributor || 0}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-primary" />
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Most Active</div>
                            <div className="text-2xl font-bold text-primary">
                                {metrics?.mostActiveDay || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collaboration Score */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Handshake className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold">Team Collaboration Score</h3>
                    <InfoTooltip text="Measures team health based on contributor activity, distribution of commits, and code ownership patterns. Higher scores indicate better collaboration." />
                </div>
                <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24">
                        <svg width="96" height="96" className="-rotate-90">
                            <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                fill="none"
                                stroke={(metrics?.collaborationScore ?? 0) > 70 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
                                strokeWidth="8"
                                strokeDasharray={`${((metrics?.collaborationScore ?? 0) / 100) * 251} 251`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                            {metrics?.collaborationScore || 0}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                            Based on number of contributors, commit distribution, and code ownership patterns.
                        </p>
                        <div className="mt-3 flex gap-2 flex-wrap">
                            {(metrics?.collaborationScore ?? 0) > 70 && (
                                <div className="px-3 py-1 bg-accent/20 rounded-full text-xs text-accent font-medium">
                                    Excellent collaboration
                                </div>
                            )}
                            <div className="px-3 py-1 bg-primary/20 rounded-full text-xs text-primary font-medium">
                                {metrics?.activeContributors}/{metrics?.totalContributors} active
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Trophy className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold">Top Contributors</h3>
                    <InfoTooltip text="Top 10 contributors ranked by commit count and number of files changed. Shows who is most actively contributing code." />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    Ranked by commit count and code impact
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contributors.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '11px' }}
                            tickFormatter={(value) => value.substring(0, 10)}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
                        <Tooltip
                            contentStyle={{
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'hsl(var(--foreground))'
                            }}
                        />
                        <Legend />
                        <Bar dataKey="commits" fill="hsl(var(--primary))" name="Commits" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="filesChanged" fill="hsl(var(--accent))" name="Files Changed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Contributor Impact Scatter */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold">Contributor Impact Analysis</h3>
                    <InfoTooltip text="Visualizes contributor activity by plotting commits vs lines added. Green dots are active contributors (committed in last 7 days), gray are inactive." />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    Commits vs Lines Changed (bubble size = impact score)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                            type="number"
                            dataKey="commits"
                            name="Commits"
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '11px' }}
                        />
                        <YAxis
                            type="number"
                            dataKey="linesAdded"
                            name="Lines Added"
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '11px' }}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'hsl(var(--foreground))'
                            }}
                            labelStyle={{
                                color: 'hsl(var(--foreground))',
                                fontWeight: 600
                            }}
                            itemStyle={{
                                color: 'hsl(var(--foreground))'
                            }}
                            cursor={{ strokeDasharray: '3 3' }}
                        />
                        <Scatter name="Contributors" data={contributors} fill="hsl(var(--primary))">
                            {contributors.map((entry: any, index: number) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.active ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground))'}
                                />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
                <div className="mt-3 flex gap-4 justify-center text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(var(--accent))' }}></div>
                        <span className="text-muted-foreground">Active (Last 7 days)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(var(--muted-foreground))' }}></div>
                        <span className="text-muted-foreground">Inactive</span>
                    </div>
                </div>
            </div>

            {/* Ownership Distribution */}
            {/* {
                ownershipData.length > 0 && (
                    <div className="bg-card border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Folder className="h-6 w-6 text-primary" />
                            <h3 className="text-xl font-heading font-bold">Code Ownership by File Type</h3>
                            <InfoTooltip text="Shows which contributors own the most files of each type. Ownership is determined by semantic analysis of code contributions." />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Distribution of file ownership across contributors
                        </p>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={ownershipData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
                                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                />
                                <Legend />
                                {contributors.slice(0, 5).map((contributor, index) => (
                                    <Bar
                                        key={contributor.name}
                                        dataKey={contributor.name}
                                        stackId="a"
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )
            } */}

            {/* Contributor Details List */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <User className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold">Contributor Details</h3>
                    <InfoTooltip text="Complete list of all committed contributors with their commit count, lines changed, and activity status. Green border indicates active in last 7 days." />
                </div>
                <div className="grid gap-2 mt-4">
                    {contributors.map((contributor: any, index: number) => (
                        <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${contributor.active ? 'border-accent bg-accent/5' : 'border-border bg-muted/30'}`}>
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                                style={{
                                    background: COLORS[index % COLORS.length],
                                    color: 'hsl(var(--card))'
                                }}
                            >
                                {contributor.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold">{contributor.name}</div>
                                <div className="text-xs text-muted-foreground">{contributor.email}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">
                                    {contributor.commits} commits
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    +{contributor.linesAdded} -{contributor.linesRemoved}
                                </div>
                            </div>
                            {contributor.active && (
                                <div className="px-2 py-1 bg-accent/20 rounded text-xs text-accent font-semibold">
                                    ACTIVE
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
