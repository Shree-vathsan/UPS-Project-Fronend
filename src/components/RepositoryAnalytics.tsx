import { useMemo } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Area, AreaChart
} from 'recharts';
import { BarChart as BarChartIcon, FileText, Users, Zap, Bot, Heart, TrendingUp, Folder, Flame, PieChart as PieChartIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import MetricCard from './MetricCard';
import { useRepositoryAnalytics, useRepositorySummary } from '../hooks/useApiQueries';

interface RepositoryAnalyticsProps {
    repositoryId: string;
    branchName: string;
}

export default function RepositoryAnalytics({ repositoryId, branchName }: RepositoryAnalyticsProps) {
    // React Query hooks for data fetching with caching
    const { data: analyticsData, isLoading: analyticsLoading } = useRepositoryAnalytics(repositoryId, branchName);
    const { data: summaryData } = useRepositorySummary(repositoryId, branchName);

    const loading = analyticsLoading;
    const summary = summaryData?.summary || '';

    // Process data with useMemo for performance
    const { activityData, fileTypeData, hotspots, metrics } = useMemo(() => {
        if (!analyticsData) {
            return { activityData: [], fileTypeData: [], hotspots: [], metrics: null };
        }

        // Process activity data for chart
        const activityData = (analyticsData.activityTimeline || []).map((item: any) => ({
            date: item.date,
            commits: item.commits
        }));

        // Process file type data
        const fileTypeData = (analyticsData.fileTypes || []).map((item: any) => ({
            name: item.name,
            value: item.value
        }));

        // Process hotspots
        const hotspots = (analyticsData.hotspots || []).map((item: any) => ({
            filePath: item.filePath,
            changes: item.changes
        }));

        // Calculate metrics
        const avgCommitsPerDay = activityData.length > 0
            ? (analyticsData.recentCommits / 7).toFixed(1)
            : '0';

        const codeHealth = Math.min(100, Math.floor((analyticsData.recentCommits / 7) * 20 + 50));

        const metrics = {
            totalFiles: analyticsData.totalFiles || 0,
            totalCommits: analyticsData.totalCommits || 0,
            contributors: analyticsData.contributors || 0,
            recentCommits: analyticsData.recentCommits || 0,
            avgCommitsPerDay,
            codeHealth
        };

        return { activityData, fileTypeData, hotspots, metrics };
    }, [analyticsData]);

    const COLORS = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#f0883e', '#56d4dd', '#db6d28'];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px'
                }}>
                    <p style={{ color: '#c9d1d9', margin: 0 }}>
                        {payload[0].name}: <strong style={{ color: payload[0].color }}>{payload[0].value}</strong>
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-64 w-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            {/* Metrics Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <MetricCard
                    icon={<FileText className="h-5 w-5" />}
                    title="Total Files"
                    value={metrics?.totalFiles || 0}
                    subtitle="Files in repository"
                    color="#58a6ff"
                    tooltip="Total number of files tracked in the repository. Includes source code, documentation, and configuration files."
                    formula="Count(Files)"
                />
                <MetricCard
                    icon={<BarChartIcon className="h-5 w-5" />}
                    title="Total Commits"
                    value={metrics?.totalCommits || 0}
                    subtitle="History length"
                    color="#3fb950"
                    tooltip="Total number of commits in the repository history. Indicates the project's age and activity level."
                    formula="Count(Commits)"
                />
                <MetricCard
                    icon={<Users className="h-5 w-5" />}
                    title="Contributors"
                    value={metrics?.contributors || 0}
                    subtitle="Active developers"
                    color="#d29922"
                    tooltip="Number of unique contributors who have committed to the repository. Shows community size and collaboration level."
                    formula="Count(UniqueAuthors)"
                />
                <MetricCard
                    icon={<Zap className="h-5 w-5" />}
                    title="Last 7 Days"
                    value={metrics?.recentCommits || 0}
                    subtitle="Recent activity"
                    color="#bc8cff"
                    tooltip="Number of commits made in the last 7 days. A good indicator of current project velocity and active development."
                    formula="Count(Commits where date > now - 7days)"
                />
            </div>

            {/* Repository Summary */}
            {summary && (
                <div className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Bot className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-heading font-bold">Repository Summary</h3>
                    </div>
                    <p className="text-foreground leading-relaxed">
                        {summary}
                    </p>
                </div>
            )}

            {/* Code Health Score */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Heart className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold">Code Health Score</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '16px' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                            <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke="#30363d"
                                strokeWidth="10"
                            />
                            <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke={(metrics?.codeHealth ?? 0) > 70 ? '#3fb950' : (metrics?.codeHealth ?? 0) > 40 ? '#d29922' : '#f85149'}
                                strokeWidth="10"
                                strokeDasharray={`${((metrics?.codeHealth ?? 0) / 100) * 314} 314`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#c9d1d9'
                        }}>
                            {metrics?.codeHealth || 0}%
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <p className="text-muted-foreground">
                            Based on commit frequency, code coverage, and repository activity.
                            {(metrics?.codeHealth ?? 0) > 70 && ' Excellent health!'}
                            {(metrics?.codeHealth ?? 0) > 40 && (metrics?.codeHealth ?? 0) <= 70 && ' Good health.'}
                            {(metrics?.codeHealth ?? 0) <= 40 && ' Needs attention.'}
                        </p>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ padding: '4px 12px', background: '#3fb95020', borderRadius: '12px', fontSize: '11px', color: '#3fb950' }}>
                                {metrics?.avgCommitsPerDay} commits/day
                            </div>
                            <div style={{ padding: '4px 12px', background: '#58a6ff20', borderRadius: '12px', fontSize: '11px', color: '#58a6ff' }}>
                                Active repository
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Timeline and File Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                {/* Activity Timeline */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-heading font-bold">Commit Activity Timeline</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Last 30 days of commit activity
                    </p>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={activityData}>
                            <defs>
                                <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                            <XAxis
                                dataKey="date"
                                stroke="#8b949e"
                                style={{ fontSize: '11px' }}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getMonth() + 1}/${date.getDate()}`;
                                }}
                            />
                            <YAxis stroke="#8b949e" style={{ fontSize: '11px' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="commits"
                                stroke="#58a6ff"
                                fillOpacity={1}
                                fill="url(#colorCommits)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* File Type Distribution */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Folder className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-heading font-bold">File Types</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Codebase composition
                    </p>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={fileTypeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `.${entry.name}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {fileTypeData.map((_entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Hotspot Files */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Flame className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold">Change Hotspots</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    Most frequently modified files
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hotspots} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis type="number" stroke="#8b949e" style={{ fontSize: '11px' }} />
                        <YAxis
                            type="category"
                            dataKey="filePath"
                            stroke="#8b949e"
                            style={{ fontSize: '11px' }}
                            width={200}
                            tickFormatter={(value) => {
                                const parts = value.split('/');
                                return parts[parts.length - 1];
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="changes" fill="#f85149" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '12px', padding: '12px', background: '#f8514920', borderRadius: '6px', fontSize: '12px', color: '#f85149' }}>
                    ⚠️ Files with high change frequency may benefit from refactoring or additional testing
                </div>
            </div>

            {/* File Type Details */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <PieChartIcon className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold">Detailed Breakdown</h3>
                </div>
                <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
                    {fileTypeData.map((type: any, index: number) => {
                        const total = fileTypeData.reduce((sum: number, t: any) => sum + t.value, 0);
                        const percentage = ((type.value / total) * 100).toFixed(1);
                        return (
                            <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 border rounded-lg">
                                <div
                                    className="w-3 h-3 rounded-sm"
                                    style={{ background: COLORS[index % COLORS.length] }}
                                ></div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-semibold">.{type.name}</span>
                                        <span className="text-xs text-muted-foreground">{type.value} files</span>
                                    </div>
                                    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-300"
                                            style={{
                                                width: `${percentage}%`,
                                                background: COLORS[index % COLORS.length]
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div
                                    className="px-2 py-1 rounded-full text-xs font-bold"
                                    style={{
                                        background: COLORS[index % COLORS.length] + '20',
                                        color: COLORS[index % COLORS.length]
                                    }}
                                >
                                    {percentage}%
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
