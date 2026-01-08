import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FileViewer from '../components/FileViewer.tsx';
import FileAnalysis from '../components/FileAnalysis.tsx';
import { API_BASE_URL } from '../config';

export default function FileTreeView() {
    const { fileId } = useParams<{ fileId: string }>();
    const [file, setFile] = useState<any>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'code' | 'analysis'>('code');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFile();
    }, [fileId]);

    const loadFile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/files/${fileId}`);
            const data = await response.json();
            setFile(data.file);
            setAnalysis(data);
        } catch (error) {
            console.error('Failed to load file:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="container">Loading file...</div>;
    }

    if (!file) {
        return <div className="container">File not found</div>;
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '24px' }}>
                <h1>{file.filePath}</h1>
                {file.totalLines && (
                    <p style={{ color: '#8b949e', fontSize: '14px' }}>
                        {file.totalLines} lines
                    </p>
                )}
            </div>

            {/* Tabs */}
            <div style={{
                borderBottom: '1px solid #30363d',
                marginBottom: '24px',
                display: 'flex',
                gap: '24px'
            }}>
                <button
                    onClick={() => setActiveTab('code')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'code' ? '#58a6ff' : '#8b949e',
                        padding: '8px 0',
                        borderBottom: activeTab === 'code' ? '2px solid #58a6ff' : 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    Code View
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'analysis' ? '#58a6ff' : '#8b949e',
                        padding: '8px 0',
                        borderBottom: activeTab === 'analysis' ? '2px solid #58a6ff' : 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    File Analysis
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'code' && <FileViewer file={file} />}
            {activeTab === 'analysis' && <FileAnalysis file={file} analysis={analysis} />}
        </div>
    );
}
