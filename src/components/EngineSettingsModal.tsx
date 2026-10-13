import React, { useState } from 'react';
import {
  X,
  Sliders,
  Check,
  Cpu,
  GraduationCap,
  Briefcase,
  Languages,
  Sparkles,
  Globe,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Settings2,
  Bot,
} from 'lucide-react';
import { TranslationEngineConfig, CustomAiConfig } from '../types';
import { apiService } from '../services/api';

interface EngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEngine: TranslationEngineConfig;
  onSelectEngine: (engine: TranslationEngineConfig) => void;
  customContext: string;
  onChangeCustomContext: (val: string) => void;
  customAiConfig: CustomAiConfig;
  onUpdateCustomAiConfig: (config: CustomAiConfig) => void;
}

export const ENGINE_PRESETS: TranslationEngineConfig[] = [
  {
    id: 'google', name: 'Google 翻译（免 Key）', subName: 'Google 网页翻译通道',
    description: '无需密钥，直接翻译正文。需要能访问 Google 的网络；网页通道可能限流，不提供 AI 摘要或术语提取。',
    badge: '免 Key', temperature: 0, terminologyStrictness: 'standard',
    recommendedFor: '日常文档、多语言对照阅读', provider: 'google',
  },
  {
    id: 'gemini-flash',
    name: 'Gemini AI 翻译',
    subName: '综合通用旗舰级大模型',
    description: '兼顾极速吞吐与精准上下文语义，适合技术文档、通用文章、多语种对照阅读。',
    badge: '推荐首选',
    temperature: 0.3,
    terminologyStrictness: 'standard',
    recommendedFor: '日常综合文档、技术白皮书、行业资讯',
    provider: 'gemini',
  },
  {
    id: 'bing',
    name: 'Bing 微软翻译（默认 · 免 Key）',
    subName: 'Microsoft Edge 网页翻译通道',
    description: '无需配置密钥，适合日常文档翻译。网页通道可能限流或暂时不可用。',
    badge: '默认',
    temperature: 0,
    terminologyStrictness: 'standard',
    recommendedFor: '无 API Key 场景、大批量长文快速通读、日常外文速览',
    provider: 'bing',
  },
  {
    id: 'custom-ai',
    name: '自定义 AI 翻译模型 (OpenAI 兼容)',
    subName: '支持 DeepSeek / Qwen / Kimi / Ollama 本地模型',
    description: '接入任意兼容 OpenAI 规范的 API 接口，自由切换 DeepSeek、通义千问、Kimi 或本地大模型。',
    badge: '灵活自定',
    temperature: 0.3,
    terminologyStrictness: 'high',
    recommendedFor: '自有大模型 Key、特定私有模型部署、本地 Ollama 离线运行',
    provider: 'custom-ai',
  },
  {
    id: 'academic',
    name: 'Gemini Academic & Tech (学术科研)',
    subName: '严谨论文与实验室标准',
    description: '深度遵循专业技术术语库，保留公式符号及逻辑推演，学术行文规范严谨。',
    badge: '学术级',
    temperature: 0.1,
    terminologyStrictness: 'maximum',
    recommendedFor: 'SCI/EI 期刊论文、专利说明书、实验报告',
    provider: 'gemini',
  },
  {
    id: 'business',
    name: 'Gemini Fluent Business (商务法务)',
    subName: '跨国合同与商业研报',
    description: '规范商业条款与法务合同措辞，准确对齐违约责任、免责赔偿与 SLA 约定。',
    badge: '商业合规',
    temperature: 0.2,
    terminologyStrictness: 'high',
    recommendedFor: '跨境商贸合同、投资尽调研报、保密协议',
    provider: 'gemini',
  },
  {
    id: 'literary',
    name: 'Gemini 自然表达',
    subName: '母语自然流畅风格',
    description: '根据目标语言习惯深度润色，避免字对字机械直译，表达通顺生动。',
    badge: '地道流畅',
    temperature: 0.6,
    terminologyStrictness: 'standard',
    recommendedFor: '散文、行业博客、跨文化交流演讲稿',
    provider: 'gemini',
  },
];

// Quick Provider Presets for easy one-click configuration
const QUICK_PROVIDERS = [
  {
    name: 'DeepSeek 官方',
    endpoint: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    badge: '高性价比 / 推理出众',
  },
  {
    name: '硅基流动 (SiliconFlow)',
    endpoint: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    badge: '国内高速免翻',
  },
  {
    name: 'OpenAI 官方',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    badge: '国际标准',
  },
  {
    name: '月之暗面 Kimi (Moonshot)',
    endpoint: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    badge: '长上下文',
  },
  {
    name: '通义千问 (DashScope)',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    badge: '阿里大模型',
  },
  {
    name: '本地 Ollama',
    endpoint: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    badge: '本地离线私有',
  },
];

export const EngineSettingsModal: React.FC<EngineSettingsModalProps> = ({
  isOpen,
  onClose,
  activeEngine,
  onSelectEngine,
  customContext,
  onChangeCustomContext,
  customAiConfig,
  onUpdateCustomAiConfig,
}) => {
  // Local state for editing custom AI config
  const [localConfig, setLocalConfig] = useState<CustomAiConfig>(customAiConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<{ latencyMs?: number; reply?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (provider: typeof QUICK_PROVIDERS[0]) => {
    const updated = {
      ...localConfig,
      endpoint: provider.endpoint,
      model: provider.model,
    };
    setLocalConfig(updated);
    onUpdateCustomAiConfig(updated);
    setTestStatus('idle');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!localConfig.endpoint.trim()) {
      setTestStatus('error');
      setTestResult({ error: '请先填写 API 接口地址 (Base URL)' });
      return;
    }

    setTestStatus('testing');
    setTestResult(null);

    const res = await apiService.testCustomAi({
      endpoint: localConfig.endpoint,
      apiKey: localConfig.apiKey,
      model: localConfig.model,
    });

    if (res.success) {
      setTestStatus('success');
      setTestResult({
        latencyMs: res.latencyMs,
        reply: res.reply || '连接成功',
      });
      onUpdateCustomAiConfig(localConfig);
    } else {
      setTestStatus('error');
      setTestResult({
        latencyMs: res.latencyMs,
        error: res.error || '连通性测试失败，请检查 URL 或密钥',
      });
    }
  };

  const handleSaveAndClose = () => {
    onUpdateCustomAiConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="border-b border-border/70 p-4 sm:p-5 bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                翻译引擎与自定义接口配置
              </h2>
              <p className="text-xs text-muted-foreground">
                支持 Google 翻译、Gemini、Bing 及自定义 AI 接口
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Engine Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                选择翻译引擎
              </span>
              <span className="text-[11px] text-muted-foreground">
                当前激活: <span className="text-purple-400 font-semibold">{activeEngine.name.split(' ')[0]}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {ENGINE_PRESETS.map((engine) => {
                const isSelected = activeEngine.id === engine.id;
                const isBing = engine.id === 'bing' || engine.id === 'google';
                const isCustom = engine.id === 'custom-ai';

                return (
                  <div
                    key={engine.id}
                    onClick={() => onSelectEngine(engine)}
                    className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? isBing
                          ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                          : isCustom
                          ? 'border-indigo-500/60 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                          : 'border-purple-500/60 bg-purple-500/10 ring-1 ring-purple-500/30'
                        : 'border-border/70 bg-card hover:border-border hover:bg-accent/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                              isSelected
                                ? isBing
                                  ? 'bg-emerald-600 text-white'
                                  : isCustom
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-purple-600 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isBing ? (
                              <Globe className="h-4 w-4" />
                            ) : isCustom ? (
                              <Bot className="h-4 w-4" />
                            ) : engine.id === 'academic' ? (
                              <GraduationCap className="h-4 w-4" />
                            ) : engine.id === 'business' ? (
                              <Briefcase className="h-4 w-4" />
                            ) : engine.id === 'literary' ? (
                              <Languages className="h-4 w-4" />
                            ) : (
                              <Cpu className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {engine.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {engine.subName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${
                              isBing
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : isCustom
                                ? 'bg-indigo-500/15 text-indigo-400'
                                : 'bg-purple-500/15 text-purple-400'
                            }`}
                          >
                            {engine.badge}
                          </span>
                          {isSelected && (
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                                isBing
                                  ? 'bg-emerald-600'
                                  : isCustom
                                  ? 'bg-indigo-600'
                                  : 'bg-purple-600'
                              }`}
                            >
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {engine.description}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground/80 border-t border-border/40 pt-1.5">
                      <span className="truncate max-w-[180px]">{engine.recommendedFor}</span>
                      <span className="font-mono shrink-0">
                        {isBing ? '免 Key' : isCustom ? '自定' : `T: ${engine.temperature}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Banner for Bing Mode */}
          {activeEngine.id === 'bing' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3 animate-in fade-in">
              <Globe className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span>已选择 Bing 免 Key 翻译</span>
                  <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[10px] font-normal text-emerald-300">无需 Key</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  翻译时通过本机后台请求 Microsoft Edge 网页翻译通道，无需密钥。此通道可能限流，不提供 AI 摘要或术语提取。
                </p>
              </div>
            </div>
          )}

          {/* Section 2: Custom AI Configuration Form (Shown prominently when Custom AI is selected or clicked) */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 transition-all ${
              activeEngine.id === 'custom-ai'
                ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                : 'border-border/80 bg-card/60'
            }`}
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <span>自定义 AI 模型接口配置</span>
                    <span className="text-[10px] font-normal text-muted-foreground font-mono">(OpenAI Compatible)</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    支持 DeepSeek、硅基流动、OpenAI、Kimi、通义千问及本地 Ollama 等接口
                  </p>
                </div>
              </div>

              {activeEngine.id !== 'custom-ai' && (
                <button
                  onClick={() => onSelectEngine(ENGINE_PRESETS.find((e) => e.id === 'custom-ai')!)}
                  className="rounded-lg bg-indigo-600/10 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  切换为此引擎
                </button>
              )}
            </div>

            {/* Quick Presets Pills */}
            <div className="space-y-1.5 mb-4">
              <span className="text-[11px] font-medium text-muted-foreground">一键填入常用提供商模板:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROVIDERS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleApplyPreset(p)}
                    className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 hover:bg-accent px-2 py-1 text-[11px] text-foreground transition-all hover:border-indigo-400/50"
                  >
                    <Zap className="h-2.5 w-2.5 text-amber-400" />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* API Base URL */}
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  API 接口地址 (Base URL) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={localConfig.endpoint}
                  onChange={(e) => {
                    const updated = { ...localConfig, endpoint: e.target.value };
                    setLocalConfig(updated);
                    onUpdateCustomAiConfig(updated);
                  }}
                  placeholder="例如: https://api.deepseek.com/v1 或 http://localhost:11434/v1"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  需兼容 OpenAI 接口规范，系统会自动在末尾挂载 <code className="text-indigo-400">/chat/completions</code>。
                </p>
              </div>

              {/* API Key & Model Name in a Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* API Key */}
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    API Key 密钥
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={localConfig.apiKey}
                      onChange={(e) => {
                        const updated = { ...localConfig, apiKey: e.target.value };
                        setLocalConfig(updated);
                        onUpdateCustomAiConfig(updated);
                      }}
                      placeholder="sk-xxxxxxxx (本地 Ollama 可留空)"
                      className="w-full rounded-xl border border-border bg-background py-2 pl-3 pr-8 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Model Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    模型名称 (Model Name) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={localConfig.model}
                    onChange={(e) => {
                      const updated = { ...localConfig, model: e.target.value };
                      setLocalConfig(updated);
                      onUpdateCustomAiConfig(updated);
                    }}
                    placeholder="例如: deepseek-chat, gpt-4o-mini, qwen-plus"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Temperature & Test Connection Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-foreground">生成温度 (Temp):</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localConfig.temperature ?? 0.3}
                    onChange={(e) => {
                      const updated = { ...localConfig, temperature: parseFloat(e.target.value) };
                      setLocalConfig(updated);
                      onUpdateCustomAiConfig(updated);
                    }}
                    className="w-24 accent-indigo-500"
                  />
                  <span className="text-xs font-mono font-semibold text-indigo-400">
                    {localConfig.temperature ?? 0.3}
                  </span>
                </div>

                {/* Test Connection Button */}
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || !localConfig.endpoint}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-400 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>{testStatus === 'testing' ? '正在连接测试...' : '测试接口连通性'}</span>
                </button>
              </div>

              {/* Test Result Feedback Banner */}
              {testStatus === 'success' && testResult && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>接口连通成功！模型正常响应。</span>
                  </div>
                  {testResult.latencyMs && (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                      延时: {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
              )}

              {testStatus === 'error' && testResult && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 flex items-start gap-2 text-xs text-red-400 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-semibold">接口连接失败</div>
                    <div className="text-[11px] text-red-300/80 leading-relaxed">{testResult.error}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Custom Domain Context & Terminology Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>自定义领域背景或术语前置提示词 (Context)</span>
              </span>
            </div>
            <textarea
              value={customContext}
              onChange={(e) => onChangeCustomContext(e.target.value)}
              placeholder="例如: 该文档属于 Transformer 大模型理论研究，请务必将 Attention 统一译为注意力机制，Token 统一译为分词元..."
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-[11px] text-muted-foreground">
              提示词将自动注入所有 AI 引擎翻译请求，确保全篇文档风格与核心术语的一致性。
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border/70 p-4 bg-background flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            设置将自动持久化保存在本地浏览器中
          </div>
          <button
            onClick={handleSaveAndClose}
            className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-500 shadow-md transition-colors active:scale-98"
          >
            完成并应用配置
          </button>
        </div>
      </div>
    </div>
  );
};
