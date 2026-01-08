import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GitPullRequest, AlertTriangle, FileText, Shield } from 'lucide-react';
import BackButton from '../components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { API_BASE_URL } from '../config';

export default function PRView() {
    const { prId } = useParams<{ prId: string }>();
    const [pr, setPr] = useState<any>(null);
    const [files, setFiles] = useState<any[]>([]);
    const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPR();
    }, [prId]);

    const loadPR = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/pullrequests/${prId}`);
            const data = await response.json();
            setPr(data.pr);
            setFiles(data.files || []);

            // Mock risk analysis - in real app this would come from backend
            setRiskAnalysis({
                riskScore: 0.65,
                structuralOverlap: 0.4,
                semanticOverlap: 0.8,
                conflictingPrs: [
                    { prNumber: 123, risk: 0.65, conflictingFiles: ['src/auth.ts', 'src/api.ts'] }
                ]
            });
        } catch (error) {
            console.error('Failed to load PR:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (risk: number): 'destructive' | 'warning' | 'success' => {
        if (risk >= 0.8) return 'destructive';
        if (risk >= 0.5) return 'warning';
        return 'success';
    };

    const getRiskLabel = (risk: number): string => {
        if (risk >= 0.8) return 'HIGH RISK';
        if (risk >= 0.5) return 'MEDIUM RISK';
        return 'LOW RISK';
    };

    if (loading) {
        return (
            <div className="container-custom py-8 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!pr) {
        return (
            <div className="container-custom py-8">
                <BackButton />
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="font-heading text-lg font-semibold">Pull request not found</h3>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const riskVariant = getRiskColor(riskAnalysis?.riskScore || 0);

    return (
        <div className="container-custom py-8 animate-fade-in">
            <BackButton />

            {/* PR Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <GitPullRequest className="h-8 w-8 text-primary" />
                    <h1 className="font-heading text-3xl font-bold">Pull Request #{pr.prNumber}</h1>
                    <Badge variant={pr.state === 'open' ? 'success' : 'secondary'}>
                        {pr.state?.toUpperCase()}
                    </Badge>
                </div>

                <Card>
                    <CardContent className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Author: {pr.authorId || 'Unknown'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Analysis */}
            {riskAnalysis && (
                <div className="mb-8">
                    <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        Conflict Risk Analysis
                    </h2>

                    <Card className={`border-2 ${riskVariant === 'destructive' ? 'border-destructive bg-destructive/5' :
                        riskVariant === 'warning' ? 'border-orange-500 bg-orange-500/5' :
                            'border-green-500 bg-green-500/5'
                        }`}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className={`text-2xl ${riskVariant === 'destructive' ? 'text-destructive' :
                                    riskVariant === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                                        'text-green-600 dark:text-green-400'
                                    }`}>
                                    {getRiskLabel(riskAnalysis.riskScore)}
                                </CardTitle>
                                <div className={`text-5xl font-bold ${riskVariant === 'destructive' ? 'text-destructive' :
                                    riskVariant === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                                        'text-green-600 dark:text-green-400'
                                    }`}>
                                    {Math.round(riskAnalysis.riskScore * 100)}%
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardDescription>Structural Overlap</CardDescription>
                                        <CardTitle className="text-3xl">
                                            {Math.round(riskAnalysis.structuralOverlap * 100)}%
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">
                                            Same files/regions being modified
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardDescription>Semantic Overlap</CardDescription>
                                        <CardTitle className="text-3xl">
                                            {Math.round(riskAnalysis.semanticOverlap * 100)}%
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">
                                            Similar code intent (AI analysis)
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Conflicting PRs */}
                            {riskAnalysis.conflictingPrs.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold">Conflicting PRs:</h4>
                                    {riskAnalysis.conflictingPrs.map((conflict: any, index: number) => (
                                        <Card key={index}>
                                            <CardContent className="py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-semibold mb-2">PR #{conflict.prNumber}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Conflicting files: {conflict.conflictingFiles.join(', ')}
                                                        </div>
                                                    </div>
                                                    <Badge variant={getRiskColor(conflict.risk)}>
                                                        {Math.round(conflict.risk * 100)}%
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* High Risk Warning */}
                            {riskAnalysis.riskScore >= 0.8 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Merge Blocked</AlertTitle>
                                    <AlertDescription>
                                        This PR has been automatically blocked due to high conflict risk.
                                        Please resolve conflicts with the listed PRs before merging.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Changed Files */}
            <div>
                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Changed Files ({files.length})
                </h2>
                {files.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="font-heading text-lg font-semibold mb-2">No files changed</h3>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {files.map((file: any) => (
                            <Card key={file.id} className="hover-lift">
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <code className="text-primary font-mono text-sm">{file.filePath}</code>
                                        {file.totalLines && (
                                            <span className="text-xs text-muted-foreground">
                                                {file.totalLines} lines
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
