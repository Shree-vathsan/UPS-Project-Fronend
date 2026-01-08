import { useEffect, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { API_BASE_URL } from '../config';

interface EnhancedFileAnalysisProps {
    file: any;
    repositoryId: string;
}

export default function EnhancedFileAnalysis({ file, repositoryId: _repositoryId }: EnhancedFileAnalysisProps) {
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState<any>(null);

    useEffect(() => {
        loadFileMetrics();
    }, [file.id]);

    const loadFileMetrics = async () => {
        try {
            // Fetch enhanced analysis from backend
            const response = await fetch(`${API_BASE_URL}/repositories/files/${file.id}/enhanced-analysis`);
            if (!response.ok) {
                throw new Error('Failed to fetch file analysis');
            }

            const data = await response.json();
            setAnalysisData(data);

        } catch (error) {
            console.error('Failed to load file metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getComplexityLevel = (value: number, max: number) => {
        const percentage = (value / max) * 100;
        if (percentage > 70) return { level: 'High', color: '#f85149' };
        if (percentage > 40) return { level: 'Medium', color: '#d29922' };
        return { level: 'Low', color: '#3fb950' };
    };

    const getMaintainabilityLevel = (value: number) => {
        if (value >= 80) return { level: 'Excellent', color: '#3fb950', icon: '🌟' };
        if (value >= 60) return { level: 'Good', color: '#58a6ff', icon: '👍' };
        if (value >= 40) return { level: 'Fair', color: '#d29922', icon: '⚠️' };
        return { level: 'Poor', color: '#f85149', icon: '🚨' };
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
                <p style={{ color: '#8b949e' }}>Analyzing file metrics...</p>
            </div>
        );
    }

    if (!analysisData) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>❌</div>
                <p style={{ color: '#8b949e' }}>No analysis data available</p>
            </div>
        );
    }

    const metrics = analysisData.metrics || {};
    const cyclomaticLevel = getComplexityLevel(metrics.cyclomaticComplexity || 0, 60);
    const maintainabilityLevel = getMaintainabilityLevel(metrics.maintainability || 0);

    const radarData = [
        { metric: 'Maintainability', value: metrics.maintainability || 0, fullMark: 100 },
        { metric: 'Test Coverage', value: metrics.testCoverage || 0, fullMark: 100 },
        { metric: 'Complexity', value: 100 - ((metrics.cyclomaticComplexity || 0) / 60 * 100), fullMark: 100 },
        { metric: 'Code Quality', value: 100 - ((metrics.codeSmells || 0) * 20), fullMark: 100 },
        { metric: 'Tech Debt', value: 100 - ((metrics.technicalDebt || 0) * 12.5), fullMark: 100 }
    ];

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            {/* Code Quality Overview */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #58a6ff20 0%, #161b22 100%)' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎯</span> Code Quality Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '16px', background: '#0d1117', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px' }}>Maintainability</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: maintainabilityLevel.color }}>
                            {maintainabilityLevel.icon}
                        </div>
                        <div style={{ fontSize: '14px', color: maintainabilityLevel.color, marginTop: '4px' }}>
                            {maintainabilityLevel.level}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                            {metrics.maintainability}/100
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '16px', background: '#0d1117', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px' }}>Cyclomatic Complexity</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: cyclomaticLevel.color }}>
                            {metrics.cyclomaticComplexity || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: cyclomaticLevel.color, marginTop: '4px' }}>
                            {cyclomaticLevel.level}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '16px', background: '#0d1117', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px' }}>Test Coverage</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: (metrics.testCoverage || 0) > 70 ? '#3fb950' : '#d29922' }}>
                            {metrics.testCoverage || 0}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                            {(metrics.testCoverage || 0) > 70 ? 'Good' : 'Needs Work'}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '16px', background: '#0d1117', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px' }}>Code Smells</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: (metrics.codeSmells || 0) > 3 ? '#f85149' : '#3fb950' }}>
                            {metrics.codeSmells || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                            Issues Found
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div className="card" style={{ background: '#0d1117' }}>
                    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Total Changes</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#58a6ff' }}>{analysisData.totalChanges || 0}</div>
                </div>
                <div className="card" style={{ background: '#0d1117' }}>
                    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Lines Added</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3fb950' }}>+{analysisData.totalAdditions || 0}</div>
                </div>
                <div className="card" style={{ background: '#0d1117' }}>
                    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Lines Removed</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f85149' }}>-{analysisData.totalDeletions || 0}</div>
                </div>
                <div className="card" style={{ background: '#0d1117' }}>
                    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Total Lines</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c9d1d9' }}>{analysisData.totalLines || 0}</div>
                </div>
            </div>

            {/* Quality Radar Chart */}
            <div className="card">
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📡</span> Quality Metrics Radar
                </h3>
                <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
                    Comprehensive view of code quality dimensions
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                        <PolarGrid stroke="#30363d" />
                        <PolarAngleAxis dataKey="metric" stroke="#8b949e" style={{ fontSize: '11px' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#8b949e" style={{ fontSize: '10px' }} />
                        <Radar name="Quality" dataKey="value" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.6} />
                        <Tooltip
                            contentStyle={{
                                background: '#161b22',
                                border: '1px solid #30363d',
                                borderRadius: '6px',
                                fontSize: '12px'
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Dependencies Chart */}
            {analysisData.dependencies && analysisData.dependencies.length > 0 && (
                <div className="card">
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📦</span> Dependencies
                    </h3>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
                        Files this file imports ({analysisData.dependencies.length} total)
                    </p>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analysisData.dependencies.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                            <XAxis type="number" stroke="#8b949e" style={{ fontSize: '11px' }} />
                            <YAxis
                                type="category"
                                dataKey="targetPath"
                                stroke="#8b949e"
                                style={{ fontSize: '11px' }}
                                width={200}
                                tickFormatter={(value) => {
                                    const parts = value.split('/');
                                    return parts[parts.length - 1];
                                }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                }}
                            />
                            <Bar dataKey={() => 1} fill="#58a6ff" name="Imports" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Dependents Chart */}
            {analysisData.dependents && analysisData.dependents.length > 0 && (
                <div className="card">
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔗</span> Dependents
                    </h3>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
                        Files that import this file ({analysisData.dependents.length} total)
                    </p>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {analysisData.dependents.slice(0, 8).map((dep: any, index: number) => (
                            <div key={index} style={{
                                padding: '12px',
                                background: '#0d1117',
                                borderRadius: '6px',
                                border: '1px solid #30363d',
                                fontSize: '12px'
                            }}>
                                <div style={{ color: '#c9d1d9', fontFamily: 'monospace' }}>{dep.importStatement}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Blast Radius (Semantic Neighbors) */}
            {analysisData.semanticNeighbors && analysisData.semanticNeighbors.length > 0 && (
                <div className="card">
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🎯</span> Blast Radius (Semantic Neighbors)
                    </h3>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
                        Files with similar code patterns (via vector similarity)
                    </p>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analysisData.semanticNeighbors}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                            <XAxis
                                dataKey="filePath"
                                stroke="#8b949e"
                                style={{ fontSize: '11px' }}
                                tickFormatter={(value) => {
                                    const parts = value.split('/');
                                    return parts[parts.length - 1];
                                }}
                            />
                            <YAxis stroke="#8b949e" style={{ fontSize: '11px' }} domain={[0, 1]} />
                            <Tooltip
                                contentStyle={{
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="similarity" fill="#bc8cff" name="Similarity Score" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Change History */}
            <div className="card">
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📜</span> Change History
                </h3>
                <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
                    Recent changes to this file
                </p>
                {analysisData.changeHistory && analysisData.changeHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analysisData.changeHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                            <XAxis dataKey="commitId" stroke="#8b949e" style={{ fontSize: '11px' }} hide />
                            <YAxis stroke="#8b949e" style={{ fontSize: '11px' }} />
                            <Tooltip
                                contentStyle={{
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="additions" fill="#3fb950" name="Lines Added" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="deletions" fill="#f85149" name="Lines Removed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p style={{ color: '#8b949e', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
                        No change history available
                    </p>
                )}
            </div>

            {/* Code Churn - Net Changes Over Time */}
            {analysisData.changeHistory && analysisData.changeHistory.length > 0 && (
                <div className="card">
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔄</span> Code Churn Analysis
                    </h3>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
                        Net line changes per commit
                    </p>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={analysisData.changeHistory.map((h: any) => ({
                            commitId: h.commitId.substring(0, 8),
                            netLines: h.additions - h.deletions
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                            <XAxis dataKey="commitId" stroke="#8b949e" style={{ fontSize: '11px' }} />
                            <YAxis stroke="#8b949e" style={{ fontSize: '11px' }} />
                            <Tooltip
                                contentStyle={{
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="netLines"
                                stroke="#d29922"
                                strokeWidth={2}
                                name="Net Change"
                                dot={{ fill: '#d29922', r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Technical Debt Warning */}
            {metrics.technicalDebt > 5 && (
                <div className="card" style={{ background: '#f8514920', border: '1px solid #f85149' }}>
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#f85149', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚠️</span> Technical Debt Alert
                    </h3>
                    <p style={{ color: '#f85149', fontSize: '14px', marginBottom: '12px' }}>
                        This file has accumulated significant technical debt
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ padding: '6px 12px', background: '#161b22', borderRadius: '12px', fontSize: '12px' }}>
                            {metrics.technicalDebt} debt hours
                        </div>
                        {metrics.codeSmells > 0 && (
                            <div style={{ padding: '6px 12px', background: '#161b22', borderRadius: '12px', fontSize: '12px' }}>
                                {metrics.codeSmells} code smells
                            </div>
                        )}
                        {metrics.cyclomaticComplexity > 40 && (
                            <div style={{ padding: '6px 12px', background: '#161b22', borderRadius: '12px', fontSize: '12px' }}>
                                High complexity
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: '12px', padding: '12px', background: '#161b22', borderRadius: '6px', fontSize: '12px' }}>
                        <strong>Recommendations:</strong>
                        <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                            {metrics.cyclomaticComplexity > 40 && <li>Consider refactoring to reduce complexity</li>}
                            {metrics.testCoverage < 70 && <li>Add more unit tests to improve coverage</li>}
                            {metrics.codeSmells > 0 && <li>Address detected code smells</li>}
                        </ul>
                    </div>
                </div>
            )}

            {/* Positive Feedback */}
            {metrics.maintainability >= 80 && metrics.testCoverage >= 70 && (
                <div className="card" style={{ background: '#3fb95020', border: '1px solid #3fb950' }}>
                    <h3 style={{ marginTop: 0, fontSize: '16px', color: '#3fb950', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✨</span> Excellent Code Quality!
                    </h3>
                    <p style={{ color: '#3fb950', fontSize: '14px', marginBottom: 0 }}>
                        This file demonstrates high maintainability and good test coverage. Keep up the great work! 🎉
                    </p>
                </div>
            )}
        </div>
    );
}
