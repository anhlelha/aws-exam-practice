import { useEffect, useState } from 'react';

interface LLMConfig {
    id: number;
    role: string;
    provider: string;
    model: string;
    api_key: string | null;
    system_prompt: string;
    max_tokens: number;
    temperature: number;
}

interface Certification {
    id: number;
    code: string;
    name: string;
    level: string;
    categories: { id: number; name: string; color: string }[];
}

interface TestResult {
    success: boolean;
    message: string;
    response?: string;
}

export default function Settings() {
    const [activeTab, setActiveTab] = useState('llm');
    const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [saving, setSaving] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<Record<string, TestResult | null>>({});

    useEffect(() => {
        fetch('http://localhost:3001/api/settings/llm')
            .then(res => res.json())
            .then(setLlmConfigs);

        fetch('http://localhost:3001/api/settings/certifications')
            .then(res => res.json())
            .then(setCertifications);
    }, []);

    const handleSaveLLM = async (config: LLMConfig) => {
        setSaving(config.role);
        try {
            await fetch(`http://localhost:3001/api/settings/llm/${config.role}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            alert('Settings saved!');
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setSaving(null);
        }
    };

    const handleTestConnection = async (config: LLMConfig) => {
        setTesting(config.role);
        setTestResult(prev => ({ ...prev, [config.role]: null }));

        try {
            const response = await fetch(`http://localhost:3001/api/settings/llm/${config.role}/test`, {
                method: 'POST'
            });
            const result = await response.json();
            setTestResult(prev => ({ ...prev, [config.role]: result }));
        } catch (error) {
            setTestResult(prev => ({
                ...prev,
                [config.role]: { success: false, message: 'Network error' }
            }));
        } finally {
            setTesting(null);
        }
    };

    const updateConfig = (role: string, field: keyof LLMConfig, value: any) => {
        setLlmConfigs(prev => prev.map(c =>
            c.role === role ? { ...c, [field]: value } : c
        ));
    };

    // Filter models based on selected provider
    const getModelsForProvider = (provider: string) => {
        switch (provider) {
            case 'openai':
                return (
                    <optgroup label="OpenAI">
                        <option value="gpt-4o">gpt-4o (Flagship)</option>
                        <option value="gpt-4o-mini">gpt-4o-mini (Fast & Affordable)</option>
                        <option value="gpt-4o-2024-11-20">gpt-4o-2024-11-20</option>
                        <option value="gpt-4o-2024-08-06">gpt-4o-2024-08-06</option>
                        <option value="gpt-4-turbo">gpt-4-turbo</option>
                        <option value="gpt-4-turbo-2024-04-09">gpt-4-turbo-2024-04-09</option>
                        <option value="gpt-4-turbo-preview">gpt-4-turbo-preview</option>
                        <option value="gpt-4">gpt-4</option>
                        <option value="o1-preview">o1-preview (Reasoning)</option>
                        <option value="o1-mini">o1-mini (Reasoning Fast)</option>
                    </optgroup>
                );
            case 'anthropic':
                return (
                    <optgroup label="Anthropic">
                        <option value="claude-sonnet-4-5-20250929">claude-sonnet-4.5 (Latest)</option>
                        <option value="claude-3-5-sonnet-20241022">claude-3.5-sonnet-v2</option>
                        <option value="claude-3-5-sonnet-20240620">claude-3.5-sonnet</option>
                        <option value="claude-3-5-haiku-20241022">claude-3.5-haiku</option>
                        <option value="claude-3-opus-20240229">claude-3-opus</option>
                        <option value="claude-3-sonnet-20240229">claude-3-sonnet</option>
                        <option value="claude-3-haiku-20240307">claude-3-haiku</option>
                    </optgroup>
                );
            case 'google':
                return (
                    <optgroup label="Google">
                        <option value="gemini-3-pro">gemini-3-pro (Latest)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                        <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                        <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                        <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                        <option value="gemini-1.5-pro-002">gemini-1.5-pro-002</option>
                        <option value="gemini-1.5-flash-002">gemini-1.5-flash-002</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                        <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    </optgroup>
                );
            case 'openrouter':
                return (
                    <optgroup label="OpenRouter (Free)">
                        <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct ⭐FREE</option>
                        <option value="google/gemma-3-27b-it:free">Gemma 3 27B ⭐FREE</option>
                        <option value="mistralai/mistral-7b-instruct:free">Mistral 7B Instruct ⭐FREE</option>
                        <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Instruct ⭐FREE</option>
                        <option value="microsoft/phi-3-mini-128k-instruct:free">Phi-3 Mini 128K ⭐FREE</option>
                        <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B ⭐FREE</option>
                        <option value="openchat/openchat-7b:free">OpenChat 7B ⭐FREE</option>
                        <option value="huggingfaceh4/zephyr-7b-beta:free">Zephyr 7B Beta ⭐FREE</option>
                        <option value="nousresearch/nous-capybara-7b:free">Nous Capybara 7B ⭐FREE</option>
                        <option value="deepseek/deepseek-r1:free">DeepSeek R1 ⭐FREE</option>
                    </optgroup>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Settings</h1>
                        <p className="page-subtitle">Configure LLM providers, manage categories by certification level.</p>
                    </div>
                </div>
            </header>

            <div className="page-body">
                <div className="tabs" style={{ marginBottom: '24px' }}>
                    <div className={`tab ${activeTab === 'llm' ? 'active' : ''}`} onClick={() => setActiveTab('llm')}>
                        LLM Configuration
                    </div>
                    <div className={`tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
                        Categories & Certifications
                    </div>
                </div>

                {activeTab === 'llm' && (
                    <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--color-primary)' }}>LLM Configuration:</strong> Set up API keys, models, and system prompts for each LLM role.
                    </div>
                )}

                {activeTab === 'llm' && (
                    <div className="grid-2">
                        {llmConfigs.map(config => (
                            <div key={config.role} className="card">
                                <div className="card-header">
                                    <h3 className="card-title">{config.role}: {
                                        config.role === 'LLM1' ? 'Question Processor' :
                                            config.role === 'LLM2' ? 'Diagram Generator' : 'AI Mentor'
                                    }</h3>
                                    <span className={`tag ${config.api_key ? 'success' : 'warning'}`}>
                                        {config.api_key ? 'Connected' : 'Not Configured'}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                        {config.role === 'LLM1' ? 'Question extraction, tagging, classification' :
                                            config.role === 'LLM2' ? 'AWS architecture diagram generation (.drawio)' :
                                                'Real-time chat assistance during practice'}
                                    </p>

                                    <div className="form-group">
                                        <label className="form-label">Provider</label>
                                        <select
                                            className="form-input form-select"
                                            value={config.provider}
                                            onChange={(e) => updateConfig(config.role, 'provider', e.target.value)}
                                        >
                                            <option value="openai">OpenAI</option>
                                            <option value="anthropic">Anthropic</option>
                                            <option value="google">Google</option>
                                            <option value="openrouter">OpenRouter</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Model</label>
                                        <select
                                            className="form-input form-select"
                                            value={config.model}
                                            onChange={(e) => updateConfig(config.role, 'model', e.target.value)}
                                        >
                                            {getModelsForProvider(config.provider)}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">API Key</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="Enter API key..."
                                            value={config.api_key || ''}
                                            onChange={(e) => updateConfig(config.role, 'api_key', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">System Prompt</label>
                                        <textarea
                                            className="form-input form-textarea"
                                            rows={4}
                                            value={config.system_prompt}
                                            onChange={(e) => updateConfig(config.role, 'system_prompt', e.target.value)}
                                        />
                                    </div>

                                    {/* Max Tokens & Temperature */}
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                            <label className="form-label">Max Tokens</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min={256}
                                                max={128000}
                                                step={256}
                                                value={config.max_tokens || 4096}
                                                onChange={(e) => updateConfig(config.role, 'max_tokens', parseInt(e.target.value) || 4096)}
                                            />
                                            <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                Maximum response length (256 - 128000)
                                            </small>
                                        </div>

                                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                            <label className="form-label">Temperature</label>
                                            <input
                                                type="range"
                                                className="form-input"
                                                min={0}
                                                max={2}
                                                step={0.1}
                                                value={config.temperature || 0.7}
                                                onChange={(e) => updateConfig(config.role, 'temperature', parseFloat(e.target.value))}
                                                style={{ width: '100%', padding: '8px 0' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                <span>Precise (0)</span>
                                                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{config.temperature || 0.7}</span>
                                                <span>Creative (2)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className={`btn ${testResult[config.role]?.success ? 'btn-success' : 'btn-secondary'}`}
                                            style={{ flex: 1 }}
                                            onClick={() => handleTestConnection(config)}
                                            disabled={testing === config.role || !config.api_key}
                                        >
                                            {testing === config.role ? (
                                                <>Testing...</>
                                            ) : testResult[config.role]?.success ? (
                                                <>✓ Connected</>
                                            ) : testResult[config.role] ? (
                                                <>✗ Failed</>
                                            ) : (
                                                <>Test Connection</>
                                            )}
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            style={{ flex: 1 }}
                                            onClick={() => handleSaveLLM(config)}
                                            disabled={saving === config.role}
                                        >
                                            {saving === config.role ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>

                                    {/* Show test result message */}
                                    {testResult[config.role] && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            background: testResult[config.role]?.success
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : 'rgba(239, 68, 68, 0.1)',
                                            color: testResult[config.role]?.success
                                                ? '#22c55e'
                                                : '#ef4444',
                                            border: `1px solid ${testResult[config.role]?.success ? '#22c55e' : '#ef4444'}40`
                                        }}>
                                            {testResult[config.role]?.message}
                                            {testResult[config.role]?.response && (
                                                <div style={{ marginTop: '4px', opacity: 0.8, fontSize: '12px' }}>
                                                    Response: {testResult[config.role]?.response}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Exam Categories by Certification</h3>
                            <button className="btn btn-primary btn-sm">+ Add Certification</button>
                        </div>
                        <div className="card-body">
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Categories are organized by certification level. Each certification has its own set of exam domains.
                            </p>

                            {certifications.map(cert => (
                                <div key={cert.id} style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div>
                                            <strong style={{ color: 'var(--color-primary)' }}>{cert.name} ({cert.code})</strong>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {cert.categories.length} domains • {cert.level}
                                            </div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm">Edit</button>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {cert.categories.map((cat, i) => (
                                            <span key={cat.id} className={`tag ${['primary', 'info', 'success', 'warning'][i % 4]}`}>
                                                {cat.name}
                                            </span>
                                        ))}
                                        {cert.categories.length === 0 && (
                                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No categories defined</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
