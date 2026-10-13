import React, { useState } from 'react';
import {
  X,
  Cloud,
  CloudCheck,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Wifi,
  WifiOff,
  Key,
  Download,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { TranslationDocument } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode: string;
  isSyncing: boolean;
  lastSyncTime: string | null;
  onTriggerSync: () => Promise<void>;
  onRestoreSync: (code: string) => Promise<void>;
  isOffline: boolean;
  onToggleOffline: () => void;
  documentCount: number;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  syncCode,
  isSyncing,
  lastSyncTime,
  onTriggerSync,
  onRestoreSync,
  isOffline,
  onToggleOffline,
  documentCount,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const copySyncCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSyncNow = async () => {
    try {
      setSuccessMsg(null);
      await onTriggerSync();
      setSuccessMsg('已成功同步当前所有翻译进度与术语库至云端！');
    } catch (e: any) {
      setRestoreError(e.message || '同步失败');
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setIsRestoring(true);
    setRestoreError(null);
    setSuccessMsg(null);

    try {
      await onRestoreSync(inputCode.trim());
      setSuccessMsg(`已成功从云端恢复工作区！当前设备已与 ${inputCode.trim()} 建立连接。`);
      setInputCode('');
    } catch (e: any) {
      setRestoreError(e.message || '恢复失败，请确认同步凭证是否正确');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-border/70 p-5 bg-gradient-to-r from-blue-900/20 via-teal-900/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white shadow-md shadow-blue-500/20">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                跨平台云端同步与离线保障
              </h2>
              <p className="text-xs text-muted-foreground">
                在手机、平板或另一台电脑上随时无缝继续翻译工作
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current Device Sync Code Box */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-blue-400" />
                <span>当前设备云端专属同步凭证 (Passkey)</span>
              </span>
              <span className="text-[10px] text-emerald-400">持续保护中</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5">
              <span className="font-mono text-sm font-bold tracking-wider text-blue-400">
                {syncCode}
              </span>
              <button
                onClick={copySyncCode}
                className="flex items-center gap-1 rounded-md bg-accent/70 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? '已复制' : '复制凭证'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>已纳管文档: {documentCount} 篇</span>
              <span>上次同步: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('zh-CN') : '刚刚'}</span>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '正在备份至云端...' : '一键同步当前工作进度至云端'}</span>
            </button>
          </div>

          {/* Connect Another Device Form */}
          <form onSubmit={handleRestore} className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5 text-teal-400" />
              <span>从其他设备恢复/切换工作区</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              在其他手机或浏览器中输入其生成的同步凭证，即可一键载入所有文档与阅读书签。
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="输入云端凭证 (如: GEMINI-ABCD-1234)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={isRestoring || !inputCode.trim()}
                className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isRestoring ? '获取中...' : '接入恢复'}</span>
              </button>
            </div>
          </form>

          {/* Feedback messages */}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400">
              <CloudCheck className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {restoreError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}

          {/* Offline Mode Switch */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  isOffline ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">
                  离线弱网阅读优化模式
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  所有已翻译文档和术语全量离线缓存，无网络也可快速查阅
                </div>
              </div>
            </div>

            <button
              onClick={onToggleOffline}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isOffline
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {isOffline ? '已激活' : '开启'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
