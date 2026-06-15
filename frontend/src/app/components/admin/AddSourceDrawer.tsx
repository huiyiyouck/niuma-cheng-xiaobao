import { useState, useEffect } from "react";
import { X, Search, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { listSources, preVerifySource, createSource } from "../../lib/api";
import { Loading } from "../ui/Loading";

interface Source {
  id: string;
  name: string;
  type: string;
  tags: string[];
  availability: string;
  isRunning: boolean;
  placementCount: number;
  isAlreadyAdded: boolean;
}

function mapType(t: string): string {
  return t === "x_twitter" ? "X/Twitter" : t === "rss" ? "RSS" : t;
}
// 后端 source → 抽屉可选源 shape；isAlreadyAdded 依据是否已在当前空间/频道
function mapAvailable(s: any, spaceName: string, channelName: string): Source {
  const positions = Array.isArray(s.display_positions) ? s.display_positions : [];
  const isAlreadyAdded = positions.some(
    (p: any) => p.space_name === spaceName && (channelName === "全部" || p.channel_name === channelName)
  );
  return {
    id: String(s.id),
    name: s.display_name ?? "",
    type: mapType(s.type),
    tags: Array.isArray(s.domain_tags) ? s.domain_tags : [],
    availability: s.availability_status ?? "normal",
    isRunning: s.operational_status === "fetching",
    placementCount: s.position_count ?? positions.length,
    isAlreadyAdded,
  };
}

interface AddSourceDrawerProps {
  open: boolean;
  onClose: () => void;
  spaceName: string;
  channelName: string;
  onAddSource: (sourceId: string) => void | Promise<void>;
}

type DrawerView = "search" | "create";
type SourceType = "x-search" | "rss";
type VerificationStatus = "idle" | "verifying" | "success" | "error";

export function AddSourceDrawer({ open, onClose, spaceName, channelName, onAddSource }: AddSourceDrawerProps) {
  const [view, setView] = useState<DrawerView>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [available, setAvailable] = useState<Source[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);

  // 信息源库全量拉取（筛选仍走前端，保持原型交互）
  async function loadAvailable() {
    setAvailableLoading(true);
    try {
      const r: any = await listSources({ page_size: 100 });
      setAvailable((r?.sources ?? []).map((s: any) => mapAvailable(s, spaceName, channelName)));
    } catch { setAvailable([]); }
    finally { setAvailableLoading(false); }
  }
  useEffect(() => { if (open) loadAvailable(); }, [open, spaceName, channelName]);

  // Create form state
  const [sourceType, setSourceType] = useState<SourceType>("x-search");
  const [identity, setIdentity] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [priority, setPriority] = useState("中");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [searchInterval, setSearchInterval] = useState("30");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const filteredSources = available.filter((source) => {
    if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter !== "all" && source.type !== typeFilter) return false;
    return source.availability === "normal";
  });

  const handleAddSource = async (sourceId: string) => {
    await onAddSource(sourceId);
    await loadAvailable(); // 重新加载以更新「已添加」状态
  };

  const handleBatchAdd = async () => {
    for (const id of selectedSources) await onAddSource(id);
    setSelectedSources([]);
    await loadAvailable();
  };

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  // 表单 → createSource 入参
  const buildCreatePayload = () => ({
    type: sourceType === "x-search" ? "x_twitter" : "rss",
    source_identity: identity.trim(),
    display_name: (displayName || identity).trim(),
    domain_tags: tags,
    content_topics: topic ? [topic] : [],
    attention_level: priority === "高" ? "core" : priority === "低" ? "observe" : "regular",
    notes: notes || undefined,
  });

  const handleVerify = async () => {
    setVerificationStatus("verifying");
    try {
      await preVerifySource({ type: sourceType === "x-search" ? "x_twitter" : "rss", source_identity: identity.trim() });
      setVerificationStatus("success");
    } catch {
      setVerificationStatus("error");
    }
  };

  const handleSaveAndAdd = async () => {
    try {
      const created: any = await createSource(buildCreatePayload());
      if (created?.id) await onAddSource(created.id);
      setView("search");
      resetCreateForm();
      await loadAvailable();
    } catch (e) { console.error(e); }
  };

  const handleSaveAsPending = async () => {
    try {
      const created: any = await createSource(buildCreatePayload());
      if (created?.id) await onAddSource(created.id);
    } catch (e) { console.error(e); }
    onClose();
    resetCreateForm();
  };

  const resetCreateForm = () => {
    setIdentity("");
    setDisplayName("");
    setTags([]);
    setRole("");
    setTopic("");
    setNotes("");
    setSearchInterval("30");
    setVerificationStatus("idle");
    setHasUnsavedChanges(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges && view === "create") {
      if (confirm("未保存的内容将丢失，确认关闭？")) {
        resetCreateForm();
        setView("search");
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[600px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {view === "create" && (
              <button
                onClick={() => setView("search")}
                className="p-1 hover:bg-accent rounded"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h3>
              {view === "search"
                ? `添加信息源到 ${spaceName} / ${channelName}`
                : "新建信息源"}
            </h3>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-accent rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {view === "search" ? (
            <div className="p-4 space-y-4">
              {/* Search Section */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="搜索信息源..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">全部类型</option>
                    <option value="RSS">RSS</option>
                    <option value="X/Twitter">X/Twitter</option>
                  </select>

                  {selectedSources.length > 0 && (
                    <button
                      onClick={handleBatchAdd}
                      className="ml-auto px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
                    >
                      批量添加 ({selectedSources.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2">
                {availableLoading && <Loading />}
                {!availableLoading && filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className={cn(
                      "border border-border rounded-lg p-3 transition-all",
                      source.isAlreadyAdded ? "opacity-50 bg-muted/30" : "hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!source.isAlreadyAdded && (
                        <input
                          type="checkbox"
                          checked={selectedSources.includes(source.id)}
                          onChange={() => toggleSourceSelection(source.id)}
                          className="mt-1"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{source.name}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            {source.type}
                          </span>
                          {source.isAlreadyAdded && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                              已添加
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {source.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          <span className="text-xs text-muted-foreground">
                            已用于 {source.placementCount} 个位置
                          </span>
                        </div>
                      </div>

                      {!source.isAlreadyAdded && (
                        <button
                          onClick={() => handleAddSource(source.id)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:opacity-90 shrink-0"
                        >
                          添加到此位置
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Create New Section */}
              <div className="pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground mb-3">找不到合适的信息源？</div>
                <button
                  onClick={() => setView("create")}
                  className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent flex items-center justify-center gap-2"
                >
                  <span>+ 新建信息源</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Source Type */}
              <div>
                <label className="block text-sm font-medium mb-2">类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSourceType("x-search");
                      setHasUnsavedChanges(true);
                    }}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-md border-2 transition-all",
                      sourceType === "x-search"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    X 搜索
                  </button>
                  <button
                    onClick={() => {
                      setSourceType("rss");
                      setHasUnsavedChanges(true);
                    }}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-md border-2 transition-all",
                      sourceType === "rss"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    RSS
                  </button>
                </div>
              </div>

              {/* Identity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {sourceType === "x-search" ? "搜索关键字" : "Feed URL"}
                </label>
                <input
                  type="text"
                  value={identity}
                  onChange={(e) => {
                    setIdentity(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder={sourceType === "x-search" ? "输入搜索关键字，如：AI OR ChatGPT" : "https://example.com/feed.xml"}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {sourceType === "x-search" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    支持 X 搜索语法，如 AND、OR、-（排除）等运算符
                  </p>
                )}
              </div>

              {/* Search Interval for X */}
              {sourceType === "x-search" && (
                <div>
                  <label className="block text-sm font-medium mb-2">搜索间隔（分钟）</label>
                  <select
                    value={searchInterval}
                    onChange={(e) => {
                      setSearchInterval(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="15">每 15 分钟</option>
                    <option value="30">每 30 分钟</option>
                    <option value="60">每 1 小时</option>
                    <option value="120">每 2 小时</option>
                    <option value="360">每 6 小时</option>
                  </select>
                </div>
              )}

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium mb-2">展示名称</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="在平台上显示的名称"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">领域标签</label>
                <input
                  type="text"
                  placeholder="输入标签后按回车添加"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value) {
                      setTags([...tags, e.currentTarget.value]);
                      e.currentTarget.value = "";
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Role & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">来源角色</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="如：媒体、个人"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">关注级别</label>
                  <select
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                  </select>
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium mb-2">内容主题</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="简要描述内容方向"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">备注</label>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Verification Status */}
              {verificationStatus === "success" && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-green-800">验证成功！可以保存并添加</div>
                </div>
              )}

              {verificationStatus === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div className="text-sm text-red-800 font-medium">验证失败</div>
                  </div>
                  <div className="text-sm text-red-700 mb-3">
                    {sourceType === "x-search" ? "搜索关键字无效或 X API 配置有误" : "无法访问该 Feed"}，请检查输入是否正确
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                {verificationStatus === "idle" || verificationStatus === "error" ? (
                  <button
                    onClick={handleVerify}
                    disabled={!identity || verificationStatus === "verifying"}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verificationStatus === "verifying" ? "验证中..." : verificationStatus === "error" ? "重新验证" : "验证"}
                  </button>
                ) : null}

                {verificationStatus === "success" && (
                  <button
                    onClick={handleSaveAndAdd}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                  >
                    保存并添加到当前位置
                  </button>
                )}

                {verificationStatus === "error" && (
                  <button
                    onClick={handleSaveAsPending}
                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent"
                  >
                    保存为待修复
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
