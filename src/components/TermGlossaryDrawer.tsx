import React, { useState } from 'react';
import { GlossaryTerm } from '../types';
import {
  X,
  BookOpen,
  Search,
  Plus,
  Trash2,
  FileDown,
  Sparkles,
  ExternalLink,
  Tag,
  Check,
} from 'lucide-react';

interface TermGlossaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  glossary: GlossaryTerm[];
  selectedTerm: GlossaryTerm | null;
  onAddTerm: (term: Omit<GlossaryTerm, 'id'>) => void;
  onDeleteTerm: (id: string) => void;
  onUpdateTerm: (term: GlossaryTerm) => void;
  onExportCsv: () => void;
}

export const TermGlossaryDrawer: React.FC<TermGlossaryDrawerProps> = ({
  isOpen,
  onClose,
  glossary,
  selectedTerm,
  onAddTerm,
  onDeleteTerm,
  onUpdateTerm,
  onExportCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);

  // New term form state
  const [newTerm, setNewTerm] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newCategory, setNewCategory] = useState<'technical' | 'academic' | 'business' | 'general'>('technical');

  if (!isOpen) return null;

  const filteredGlossary = glossary.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newTranslation.trim()) return;

    onAddTerm({
      term: newTerm.trim(),
      translation: newTranslation.trim(),
      explanation: newExplanation.trim() || '自定义重点词汇',
      category: newCategory,
      highlighted: true,
    });

    setNewTerm('');
    setNewTranslation('');
    setNewExplanation('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">重点术语与词汇表</h2>
              <p className="text-xs text-muted-foreground">
                共提取 {glossary.length} 个高价值专业词条
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onExportCsv}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="导出术语库 CSV"
            >
              <FileDown className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="border-b border-border/70 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索术语、中文对照或释义..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {['all', 'technical', 'academic', 'business'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-2 py-0.5 capitalize transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-500/15 text-blue-400 font-medium'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {cat === 'all' ? '全部' : cat === 'technical' ? '技术' : cat === 'academic' ? '学术' : '商务'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium shrink-0"
            >
              <Plus className="h-3 w-3" />
              <span>添加术语</span>
            </button>
          </div>
        </div>

        {/* Add Term Form Collapse */}
        {isAdding && (
          <form onSubmit={handleCreateTerm} className="border-b border-border bg-accent/20 p-3 space-y-2 text-xs">
            <div className="font-semibold text-foreground text-xs">新增自定义术语</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="英文原词 (如: Self-Attention)"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                className="rounded border border-border bg-background p-1.5 text-xs text-foreground"
                required
              />
              <input
                type="text"
                placeholder="中文标准译法"
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                className="rounded border border-border bg-background p-1.5 text-xs text-foreground"
                required
              />
            </div>
            <textarea
              placeholder="专业定义、使用规范或上下文笔记"
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              rows={2}
              className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground"
            />
            <div className="flex items-center justify-between">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value="technical">技术研发</option>
                <option value="academic">学术理论</option>
                <option value="business">商务法务</option>
                <option value="general">通用词汇</option>
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded px-2 py-1 text-muted-foreground hover:bg-accent"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-500"
                >
                  保存词条
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Term List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredGlossary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground text-xs">
              <BookOpen className="h-8 w-8 mb-2 opacity-40" />
              <p>暂无符合条件的术语词条</p>
              <p className="text-[11px] mt-1">可在正文中点击词汇或手动添加</p>
            </div>
          ) : (
            filteredGlossary.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-border/70 bg-card/60 p-3.5 hover:border-blue-500/40 hover:bg-card transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-foreground tracking-tight">
                      {item.term}
                    </div>
                    <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                      = {item.translation}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {item.category && (
                      <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                        {item.category}
                      </span>
                    )}
                    <button
                      onClick={() => onDeleteTerm(item.id)}
                      className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="删除该术语"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {item.explanation}
                </p>

                {/* User custom notes */}
                {item.userNotes && (
                  <div className="mt-2 rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-300">
                    <span className="font-semibold">个人笔记: </span>
                    {item.userNotes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
