import React, { useState, useRef } from 'react';
import {
  X,
  History,
  Search,
  Star,
  Trash2,
  FileText,
  Clock,
  ArrowRight,
  Folder,
  Tag,
  Check,
  Edit2,
  FileDown,
  CloudCheck,
  FileUp,
} from 'lucide-react';
import { TranslationDocument, DocumentCategory } from '../types';
import { ColoredFeatureIcon } from './GeminiIcon';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: TranslationDocument[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onToggleStar: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onRenameDoc: (id: string, newTitle: string) => void;
  onUploadFile?: (file: File) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  activeDocId,
  onSelectDoc,
  onToggleStar,
  onDeleteDoc,
  onRenameDoc,
  onUploadFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories: (DocumentCategory | 'all')[] = [
    'all',
    '学术科研',
    '商务法务',
    '技术手册',
    '通用资讯',
  ];

  const filteredDocs = documents.filter((doc) => {
    if (onlyStarred && !doc.starred) return false;
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const matchTitle = doc.title.toLowerCase().includes(q) || doc.fileName.toLowerCase().includes(q);
    const matchTags = doc.tags.some((t) => t.toLowerCase().includes(q));
    const matchSegment = doc.segments.some(
      (s) => s.original.toLowerCase().includes(q) || (s.translated && s.translated.toLowerCase().includes(q))
    );
    return matchTitle || matchTags || matchSegment;
  });

  const handleStartRename = (doc: TranslationDocument) => {
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameDoc(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="flex h-full w-full max-w-md flex-col border-r border-border bg-card shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <ColoredFeatureIcon color="sky" size="lg">
              <History className="h-4 w-4" />
            </ColoredFeatureIcon>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                历史翻译记录与分类归档
              </h2>
              <p className="text-xs text-muted-foreground">
                已存储 {documents.length} 篇文档 (支持全文精准检索)
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

        {/* Direct Local PDF Import Button */}
        {onUploadFile && (
          <div className="p-3 border-b border-border/70 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 text-xs font-semibold shadow-sm transition-all active:scale-98"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>+ 导入新的本地 PDF / 文档</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadFile(e.target.files[0]);
                  onClose();
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </div>
        )}

        {/* Search Bar & Category Filters */}
        <div className="border-b border-border/70 p-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索文档名称、标签或原/译文关键词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-2 py-0.5 whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-500/15 text-blue-400 font-medium'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {cat === 'all' ? '全部' : cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors shrink-0 ${
                onlyStarred ? 'bg-amber-500/15 text-amber-400 font-medium' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Star className="h-3 w-3" />
              <span>星标</span>
            </button>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground text-xs">
              <Folder className="h-8 w-8 mb-2 opacity-40" />
              <p>未找到符合检索条件的文档</p>
              <p className="text-[11px] mt-1">尝试更换关键词或清除筛选分类</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isActive = activeDocId === doc.id;
              const isEditing = editingId === doc.id;
              const translatedCount = doc.segments.filter((s) => s.translated).length;
              const percent = doc.segments.length > 0 ? Math.round((translatedCount / doc.segments.length) * 100) : 0;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectDoc(doc.id);
                      onClose();
                    }
                  }}
                  className={`group relative rounded-xl border p-3 cursor-pointer transition-all ${
                    isActive
                      ? 'border-blue-500/60 bg-blue-500/10 shadow-sm'
                      : 'border-border/60 bg-card hover:border-border hover:bg-accent/40'
                  }`}
                >
                  {/* Top line: Category and Star */}
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground leading-none">
                        {doc.category}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {doc.sourceLang} → {doc.targetLang}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(doc.id);
                        }}
                        className={`p-1 rounded hover:bg-muted ${
                          doc.starred ? 'text-amber-400' : 'text-muted-foreground/60 hover:text-foreground'
                        }`}
                        title="收藏星标"
                      >
                        <Star className="h-3.5 w-3.5" fill={doc.starred ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(doc);
                        }}
                        className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        title="重命名文档"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>

                      {documents.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDoc(doc.id);
                          }}
                          className="p-1 rounded text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除记录"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title or inline edit */}
                  {isEditing ? (
                    <div className="my-1.5 flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 rounded border border-blue-500 bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(doc.id)}
                        className="rounded bg-blue-600 px-2 text-xs text-white"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {doc.title}
                    </div>
                  )}

                  {/* Progress and metadata */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-muted rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span>{percent}% 对照完成</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(doc.updatedAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
