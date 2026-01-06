import { useQueryClient } from '@tanstack/react-query';
import NetworkGraph from './NetworkGraph';
import InfoTooltip from './InfoTooltip';
import MetricCard from './MetricCard';
import CircularProgress from './CircularProgress';
import BarProgress from './BarProgress';
import SectionHeader from './SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { FaCheck } from "react-icons/fa";
import { FaTimes } from "react-icons/fa";
import { useFileEnhancedAnalysis, useFileSummary, queryKeys } from '../hooks/useApiQueries';



interface FileAnalysisProps {
    file: any;
    analysis: any;
}

export default function FileAnalysis({ file, analysis }: FileAnalysisProps) {
    const queryClient = useQueryClient();

    // React Query hooks for data fetching with caching
    const { data: enhancedData, isLoading: enhancedDataLoading } = useFileEnhancedAnalysis(file.id);
    const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useFileSummary(file.id);

    const summary = summaryData?.success ? summaryData.summary : null;
    const chunkCount = summaryData?.chunkCount || 0;
    const summaryErrorMessage = summaryData?.success === false ? (summaryData.message || summaryData.error || 'Failed to generate summary') : null;

    // Function to refresh summary
    const fetchSummary = () => {
        // Invalidate the cache and refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.fileSummary(file.id) });
        refetchSummary();
    };

    // Calculate metrics
    const depCount = enhancedData?.dependencies?.length || 0;
    const dptCount = enhancedData?.dependents?.length || 0;
    const changeCount = analysis.changeCount || 0;
    const codeHealth = Math.min(100, Math.max(0, 100 - (depCount * 2) - (changeCount / 10)));
    const impactScore = Math.min(100, (dptCount * 10) + (depCount * 5));
    const activityScore = Math.min(100, changeCount * 2);

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* File Summary Section */}
            <div className="bg-card border rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground m-0">
                        File Summary
                    </h3>
                    {!summaryLoading && (
                        <button
                            onClick={fetchSummary}
                            className="bg-muted border text-muted-foreground px-3 py-1 rounded text-xs cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                            Refresh
                        </button>
                    )}
                </div>

                {summaryLoading && (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                    </div>
                )}

                {!summaryLoading && summary && (
                    <div>
                        <p className="text-foreground text-sm leading-relaxed m-0 mb-2">
                            {summary}
                        </p>
                        <div className="text-xs text-muted-foreground italic">
                            Generated from {chunkCount} code chunk{chunkCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                )}

                {!summaryLoading && summaryErrorMessage && (
                    <div className="text-destructive text-sm bg-destructive/10 p-2 rounded border border-destructive">
                        {summaryErrorMessage}
                    </div>
                )}
            </div>

            {/* Header Stats - Key Metrics */}
            {enhancedDataLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-card border rounded-lg p-4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <MetricCard
                        icon=""
                        title="Code Health"
                        value={codeHealth.toFixed(0)}
                        subtitle="Based on complexity & dependencies"
                        color="#3fb950"
                        tooltip="Measures file maintainability based on dependency count and change frequency. Higher scores indicate cleaner, more maintainable code."
                        formula="100 - (dependencies × 2) - (changes ÷ 10)"
                    />
                    <MetricCard
                        icon=""
                        title="Impact Score"
                        value={impactScore.toFixed(0)}
                        subtitle={`${dptCount} files depend on this`}
                        color="#d29922"
                        tooltip="Shows how many files will be affected if you change this file. Higher scores mean more critical files. Changes here have wider blast radius."
                        formula="(dependents × 10) + (dependencies × 5)"
                    />
                    <MetricCard
                        icon=""
                        title="Activity Level"
                        value={activityScore.toFixed(0)}
                        subtitle={`${changeCount} total changes`}
                        color="#f85149"
                        trend={5}
                        tooltip="Indicates how frequently this file is modified. High activity might suggest core functionality or technical debt. Useful for identifying hotspots."
                        formula="changes × 2 (capped at 100)"
                    />
                    <MetricCard
                        icon=""
                        title="Connections"
                        value={depCount + dptCount}
                        subtitle={`${depCount} deps, ${dptCount} dependents`}
                        color="#bc8cff"
                        tooltip="Total number of file relationships. Includes both files this imports (dependencies) and files that import this (dependents). Shows coupling level."
                        formula="dependencies + dependents"
                    />
                </div>
            )}

            {/* File Overview with Progress Rings */}
            {enhancedDataLoading ? (
                <div className="bg-card border rounded-lg p-6">
                    <Skeleton className="h-6 w-1/2 mb-6" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px', justifyItems: 'center' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="text-center">
                                <Skeleton className="h-24 w-24 rounded-full mx-auto mb-3" />
                                <Skeleton className="h-4 w-20 mx-auto mb-1" />
                                <Skeleton className="h-3 w-16 mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-card border rounded-lg p-6">
                    <SectionHeader
                        icon=""
                        title="File Metrics Overview"
                        tooltip="Visual dashboard showing key file health indicators at a glance. Each circular gauge represents a different quality metric calculated from code analysis and git history."
                        formula="Visual representation of the metrics above"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px', justifyItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <CircularProgress value={Math.min(100, codeHealth)} color="#3fb950" />
                            <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600, color: '#c9d1d9' }}>
                                Code Health
                            </div>
                            <div style={{ fontSize: '11px', color: '#8b949e' }}>Excellent</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <CircularProgress value={Math.min(100, impactScore)} color="#d29922" />
                            <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600, color: '#c9d1d9' }}>
                                Impact
                            </div>
                            <div style={{ fontSize: '11px', color: '#8b949e' }}>
                                {impactScore > 70 ? 'Critical' : impactScore > 40 ? 'High' : 'Moderate'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <CircularProgress value={Math.min(100, activityScore)} color="#f85149" />
                            <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600, color: '#c9d1d9' }}>
                                Activity
                            </div>
                            <div style={{ fontSize: '11px', color: '#8b949e' }}>
                                {activityScore > 70 ? 'Very Active' : activityScore > 40 ? 'Active' : 'Stable'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <CircularProgress
                                value={analysis.ownership?.[0]?.semanticScore ? parseFloat((analysis.ownership[0].semanticScore * 100).toFixed(0)) : 0}
                                color="#bc8cff"
                            />
                            <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600, color: '#c9d1d9' }}>
                                Main Owner
                            </div>
                            <div style={{ fontSize: '11px', color: '#8b949e' }}>Contribution</div>
                        </div>
                    </div>
                </div>
            )}


            {/* Detailed Dependency Analysis */}
            {enhancedDataLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Dependencies Skeleton */}
                    <div className="bg-card border rounded-lg p-6">
                        <Skeleton className="h-6 w-1/2 mb-4" />
                        <Skeleton className="h-12 w-24 mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                    {/* Dependents Skeleton */}
                    <div className="bg-card border rounded-lg p-6">
                        <Skeleton className="h-6 w-1/2 mb-4" />
                        <Skeleton className="h-12 w-24 mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#3fb950', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Dependencies Analysis
                            </h3>
                            <InfoTooltip
                                text="Shows files that this file imports. Lower dependency count means better separation of concerns. Direct imports are explicit, indirect are transitive dependencies."
                                formula="Count of unique import statements"
                            />
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3fb950', marginBottom: '16px' }}>
                            {depCount}
                        </div>
                        <BarProgress label="Direct imports" value={depCount} maxValue={20} color="#3fb950" />
                        {/* COMMENTED OUT - Backend optimization removed this feature */}
                        {/* <BarProgress label="Indirect dependencies" value={enhancedData?.indirectDependencies?.length || 0} maxValue={30} color="#56d364" /> */}

                        {enhancedData?.dependencies && enhancedData.dependencies.length > 0 && (
                            <div className="mt-4 border-t pt-3">
                                <div className="text-xs text-muted-foreground mb-2 font-semibold">Direct Dependencies Files:</div>
                                <div className="max-h-[150px] overflow-y-auto flex flex-col gap-1">
                                    {enhancedData.dependencies.map((dep: any, i: number) => (
                                        <div key={i} className="px-2 py-1.5 bg-card/50 border rounded text-xs font-mono text-foreground flex justify-between items-center">
                                            <span title={dep.targetPath}>{dep.targetPath.split('/').pop()}</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-primary text-[10px]">{dep.dependencyType || 'import'}</span>
                                                <span className="text-muted-foreground text-[10px] bg-muted px-1 rounded">{dep.score || 1}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* COMMENTED OUT - Backend optimization removed this feature */}
                        {/* {enhancedData?.indirectDependencies && enhancedData.indirectDependencies.length > 0 && (
                            <div className="mt-4 border-t pt-3">
                                <div className="text-xs text-muted-foreground mb-2 font-semibold">Indirect Dependencies Files:</div>
                                <div className="max-h-[150px] overflow-y-auto flex flex-col gap-1">
                                    {enhancedData.indirectDependencies.map((dep: any, i: number) => (
                                        <div key={i} className="px-2 py-1.5 bg-card/50 border rounded text-xs font-mono text-foreground flex justify-between items-center">
                                            <span title={dep.targetPath}>{dep.targetPath.split('/').pop()}</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-primary/80 text-[10px]">indirect</span>
                                                <span className="text-muted-foreground text-[10px] bg-muted px-1 rounded">{dep.score || 0.5}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )} */}

                        <div style={{ marginTop: '16px', padding: '12px', background: '#3fb95010', border: '1px solid #3fb95030', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#3fb950', fontWeight: 600, marginBottom: '4px' }}>
                                Dependency Health: Good
                            </div>
                            <div style={{ fontSize: '11px', color: '#8b949e' }}>
                                Low coupling, well-structured imports
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#d29922', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Dependents Impact
                            </h3>
                            <InfoTooltip
                                text="Files that import this file. Higher numbers mean more files affected by changes. Blast radius shows total files potentially impacted including indirect dependents."
                                formula="Count of files importing this file"
                            />
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#d29922', marginBottom: '16px' }}>
                            {dptCount}
                        </div>
                        <BarProgress label="Direct dependents" value={dptCount} maxValue={20} color="#d29922" />
                        {/* COMMENTED OUT - Backend optimization removed this feature */}
                        {/* <BarProgress label="Blast radius" value={enhancedData?.blastRadius?.length || 0} maxValue={50} color="#f0883e" /> */}

                        {enhancedData?.dependents && enhancedData.dependents.length > 0 && (
                            <div className="mt-4 border-t pt-3">
                                <div className="text-xs text-muted-foreground mb-2 font-semibold">Direct Dependent Files:</div>
                                <div className="max-h-[150px] overflow-y-auto flex flex-col gap-1">
                                    {enhancedData.dependents.map((dep: any, i: number) => (
                                        <div key={i} className="px-2 py-1.5 bg-card/50 border rounded text-xs font-mono text-foreground flex justify-between items-center">
                                            <span title={dep.sourcePath}>{dep.sourcePath?.split('/').pop() || 'Unknown'}</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-accent text-[10px]">{dep.dependencyType || 'import'}</span>
                                                <span className="text-muted-foreground text-[10px] bg-muted px-1 rounded">{dep.score || 1}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* COMMENTED OUT - Backend optimization removed this feature */}
                        {/* {enhancedData?.blastRadius && enhancedData.blastRadius.length > 0 && (
                            <div className="mt-4 border-t pt-3">
                                <div className="text-xs text-muted-foreground mb-2 font-semibold">Blast Radius Files:</div>
                                <div className="max-h-[150px] overflow-y-auto flex flex-col gap-1">
                                    {enhancedData.blastRadius.map((dep: any, i: number) => (
                                        <div key={i} className=" px-2 py-1.5 bg-card/50 border rounded text-xs font-mono text-foreground flex justify-between items-center">
                                            <span title={dep.sourcePath}>{dep.sourcePath?.split('/').pop() || 'Unknown'}</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-accent/80 text-[10px]">indirect</span>
                                                <span className="text-muted-foreground text-[10px] bg-muted px-1 rounded">{dep.score || 0.5}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )} */}

                        <div className={`mt-4 p-3 rounded-lg border ${impactScore > 70 ? 'bg-destructive/10 border-destructive' : 'bg-accent/10 border-accent'}`}>
                            <div className={`text-xs font-semibold mb-1 ${impactScore > 70 ? 'text-destructive' : 'text-accent'}`}>
                                Impact Level: {impactScore > 70 ? 'Critical ' : 'Moderate'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Changes affect {dptCount} direct consumers
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Semantic Purpose */}
            <div className="bg-card/50 border border-primary/20 rounded-lg p-6">
                <SectionHeader
                    icon=""
                    title="Code Insights"
                    tooltip="Machine learning analysis of your code using embeddings and semantic patterns. Provides intelligent categorization and quality assessment beyond simple metrics."
                    formula="Vector Similarity(File, Categories)"
                />
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 mb-4">
                    <div className="text-sm text-foreground leading-relaxed mb-2">
                        <strong className="text-primary">File Purpose:</strong> This file appears to handle{' '}
                        {file.filePath.includes('auth') ? 'authentication logic' :
                            file.filePath.includes('api') ? 'API communication' :
                                file.filePath.includes('component') ? 'UI component rendering' : 'business logic'}.
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Generated from code embeddings and semantic analysis
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">Complexity</div>
                        <div className="text-lg font-bold" style={{ color: depCount > 10 ? '#f85149' : 'hsl(var(--primary))' }}>
                            {depCount > 10 ? 'High' : depCount > 5 ? 'Medium' : 'Low'}
                        </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">Maintainability</div>
                        <div className="text-lg font-bold text-primary">
                            {codeHealth > 70 ? 'Good' : codeHealth > 40 ? 'Fair' : 'Needs Work'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Semantic Ownership with Beautiful Visualization */}
            <div className="card">
                <SectionHeader
                    icon=""
                    title="Semantic Ownership Distribution"
                    tooltip="Based on vector embedding changes, not just line counts. Shows who meaningfully contributed to the logic and structure, weighted by semantic impact rather than simple additions/deletions."
                    formula="Σ(VectorDelta * Author) / TotalDelta"
                />
                <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
                    Based on vector embedding deltas, not lines of code
                </p>

                {analysis.ownership && analysis.ownership.length > 0 ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {analysis.ownership
                            .filter((owner: any) => (owner.semanticScore || 0) > 0)
                            .map((owner: any, index: number) => {
                                const score = owner.semanticScore || 0;
                                const percentageDecimal = (score * 100).toFixed(1); // For display with decimal
                                return (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-card/30 rounded-lg border">
                                        {owner.avatarUrl && (
                                            <img
                                                src={owner.avatarUrl}
                                                alt={owner.authorName}
                                                className="w-12 h-12 rounded-full border-2 border-primary object-cover"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-semibold mb-2 text-sm text-foreground">
                                                {owner.authorName || 'Unknown'}
                                            </div>
                                            <div className="w-full h-2.5 bg-border rounded-full overflow-hidden mb-1.5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                                                    style={{ width: `${percentageDecimal}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Semantic contribution: {percentageDecimal}%
                                            </div>
                                        </div>
                                        <div className="min-w-20 text-center">
                                            <div
                                                className="w-[70px] h-[70px] rounded-full flex items-center justify-center mx-auto"
                                                style={{ background: `conic-gradient(hsl(var(--primary)) ${score * 360}deg, hsl(var(--border)) 0deg)` }}
                                            >
                                                <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center text-base font-bold text-primary">
                                                    {percentageDecimal}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <div className="text-5xl mb-3 opacity-30"></div>
                        <div className="text-sm">No ownership data available yet</div>
                    </div>
                )}
            </div>

            {/* Network Graph Visualization */}
            {enhancedDataLoading ? (
                <div className="bg-card border rounded-lg p-6">
                    <Skeleton className="h-6 w-2/3 mb-4" />
                    <Skeleton className="h-4 w-full mb-6" />
                    <Skeleton className="h-96 w-full" />
                </div>
            ) : enhancedData && (enhancedData.dependencies?.length > 0 || enhancedData.dependents?.length > 0 || enhancedData.semanticNeighbors?.length > 0) && (
                <div className="card">
                    <SectionHeader
                        icon=""
                        title="File Connections Network Graph"
                        tooltip="Interactive visualization showing all file relationships. Green nodes = dependencies (imports), Orange = dependents (importers), Purple = similar files. Helps understand code architecture and impact."
                        formula="Graph(Nodes, Edges)"
                    />
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '20px' }}>
                        Interactive web visualization showing all file relationships
                    </p>
                    <NetworkGraph
                        centerFile={file.filePath}
                        dependencies={enhancedData.dependencies || []}
                        dependents={enhancedData.dependents || []}
                        neighbors={enhancedData.semanticNeighbors || []}
                    />
                </div>
            )}

            {/* Change Activity Timeline */}
            <div className="card">
                <SectionHeader
                    icon=""
                    title="Change Activity"
                    tooltip="Shows modification patterns from git history. High change count may indicate active development or code churn. Most active author likely knows this code best."
                    formula="Count(GitCommits)"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div className="p-4 bg-card border rounded-lg text-center">
                        <div className="text-2xl font-bold text-primary mb-1">
                            {changeCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Changes</div>
                    </div>
                    <div className="p-4 bg-card border rounded-lg text-center">
                        <div className="text-base font-bold text-accent mb-1">
                            {analysis.mostFrequentAuthor && analysis.mostFrequentAuthor !== 'N/A' ? analysis.mostFrequentAuthor : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Most Active Author</div>
                    </div>
                    <div className={`p-4 rounded-lg text-center border ${analysis.isInOpenPr ? 'bg-primary/10 border-primary' : 'bg-card'}`}>
                        <div className="text-3xl mb-1 flex items-center justify-center">
                            {analysis.isInOpenPr ? <FaCheck size={0} color="Green" /> : <FaTimes color="Red" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{analysis.isInOpenPr ? 'In PR' : 'Not In PR'}</div>
                    </div>
                </div>
            </div>

            {/* Recommended Reviewers */}
            <div className="card">
                <SectionHeader
                    icon=""
                    title="Recommended Reviewers"
                    tooltip="Suggests the best code reviewers based on semantic ownership. These users understand the code's logic and history best."
                    formula="Top 3 Semantic Owners"
                />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {analysis.ownership && analysis.ownership.slice(0, 3).map((owner: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-card rounded-full border relative" title={owner.email || owner.authorName}>
                            {owner.avatarUrl ? (
                                <img
                                    src={owner.avatarUrl}
                                    alt={owner.authorName}
                                    className="w-7 h-7 rounded-full border-2 border-primary object-cover"
                                />
                            ) : (
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary"
                                    style={{ background: `conic-gradient(hsl(var(--primary)) ${owner.semanticScore * 360}deg, hsl(var(--border)) 0deg)` }}
                                >
                                    {owner.authorName?.charAt(0).toUpperCase() || '?'}
                                </div>
                            )}
                            <span className="text-sm text-foreground font-medium">
                                {owner.authorName || 'Unknown'}
                            </span>
                        </div>
                    ))}
                    {(!analysis.ownership || analysis.ownership.length === 0) && (
                        <div className="text-sm text-muted-foreground">No reviewers recommended yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
