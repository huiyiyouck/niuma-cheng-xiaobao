import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, RefreshCw, Download, ExternalLink, Trash2, ChevronUp, ChevronDown, Repeat } from "lucide-react";
import { cn } from "../../lib/utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "../ui/alert-dialog";
import { AddSourceDrawer } from "./AddSourceDrawer";
import { Badge } from "../ui/badge";
import { PlacementTooltip } from "../ui/PlacementTooltip";
import { listSources, syncXRules, deleteSource } from "../../lib/api";
import { toast } from "sonner";
import { Loading } from "../ui/Loading";

type SortField = "name" | "type" | "availability" | "lastFetch" | "totalNews";
type SortDirection = "asc" | "desc";

function fmtAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}
function mapType(t: string): string {
  return t === "x_twitter" ? "X/Twitter" : t === "rss" ? "RSS" : t;
}
const availabilityFromBackend: Record<string, string> = {
  normal: "normal", needs_fix: "needs-fix", source_error: "source-error", removed: "removed",
};
// 后端 source → 原型表格 shape
function mapSource(s: any) {
  const positions = Array.isArray(s.display_positions) ? s.display_positions : [];
  return {
    id: String(s.id),
    name: s.display_name ?? "",
    identity: s.source_identity ?? "",
    type: mapType(s.type),
    tags: Array.isArray(s.domain_tags) ? s.domain_tags : [],
    availability: availabilityFromBackend[s.availability_status] ?? s.availability_status,
    isRunning: s.operational_status === "fetching",
    placements: positions.map((p: any) => ({ space: p.space_name ?? "", channel: p.channel_name ?? "" })),
    lastFetch: fmtAgo(s.last_fetched_at),
    totalNews: s.total_news_count ?? 0,
  };
}

const availabilityLabels: Record<string, string> = {
  normal: "正常",
  "needs-fix": "待修复",
  "source-error": "来源异常",
  removed: "已移除",
};

export function SourceLibrary() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [runningFilter, setRunningFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [createDrawer, setCreateDrawer] = useState(false);
  // 同步 X 规则二次确认弹窗
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);

  // 一次拉全量，筛选/排序/分页仍由前端处理（保持原型交互）
  async function loadSources() {
    setLoading(true);
    try {
      const r: any = await listSources({ page_size: 100 });
      setSources((r?.sources ?? []).map(mapSource));
    } catch { setSources([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadSources(); }, []);

  // 刷新：转圈 + 成功/失败 toast
  async function handleRefresh() {
    setRefreshing(true);
    try {
      const r: any = await listSources({ page_size: 100 });
      setSources((r?.sources ?? []).map(mapSource));
      toast.success("信息源列表已刷新");
    } catch { toast.error("刷新失败，请重试"); }
    finally { setRefreshing(false); }
  }

  // 同步 X 规则：经二次确认弹窗触发；转圈 + 成功/失败 toast
  async function handleSync() {
    setSyncing(true);
    try {
      await syncXRules();
      const r: any = await listSources({ page_size: 100 });
      setSources((r?.sources ?? []).map(mapSource));
      setConfirmSyncOpen(false);
      toast.success("X 规则同步完成");
    } catch {
      toast.error("X 规则同步失败，请重试");
    }
    finally { setSyncing(false); }
  }

  const hasActiveFilters = searchQuery || typeFilter !== "all" || availabilityFilter !== "all" || runningFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setAvailabilityFilter("all");
    setRunningFilter("all");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline" />
    ) : (
      <ChevronDown className="h-4 w-4 inline" />
    );
  };

  const filteredSources = sources.filter((source) => {
    if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter !== "all" && source.type !== typeFilter) return false;
    if (availabilityFilter !== "all" && source.availability !== availabilityFilter) return false;
    if (runningFilter === "running" && !source.isRunning) return false;
    if (runningFilter === "stopped" && source.isRunning) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredSources.length / perPage);
  const paginatedSources = filteredSources.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDeleteSource = (source: any) => {
    setDeleteDialog({
      open: true,
      data: {
        type: "source",
        id: source.id,
        name: source.name,
        placementCount: source.placements.length,
        newsCount: source.totalNews,
      },
    });
  };

  return (
    <div className="p-6">
      {/* Search and Actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="搜索信息源名称、身份、主题、备注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setCreateDrawer(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 whitespace-nowrap"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          新建信息源
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent whitespace-nowrap disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4 inline mr-2", refreshing && "animate-spin")} />
          刷新
        </button>
        <button
          onClick={() => setConfirmSyncOpen(true)}
          disabled={syncing}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent whitespace-nowrap disabled:opacity-60"
        >
          <Repeat className={cn("h-4 w-4 inline mr-2", syncing && "animate-spin")} />
          同步 X 规则
        </button>

        <AlertDialog open={confirmSyncOpen} onOpenChange={(o) => { if (!syncing) setConfirmSyncOpen(o); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>同步 X 规则？</AlertDialogTitle>
              <AlertDialogDescription>
                将按当前 X 信息源配置向 X（Twitter）平台重新下发抓取规则。该操作会调用外部平台接口、可能需要数十秒，期间请勿重复触发。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={syncing}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleSync(); }}
                disabled={syncing}
              >
                {syncing ? "同步中…" : "确认同步"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">类型:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">全部</option>
              <option value="RSS">RSS</option>
              <option value="X/Twitter">X/Twitter</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">可用性:</span>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">全部</option>
              <option value="normal">正常</option>
              <option value="needs-fix">待修复</option>
              <option value="source-error">来源异常</option>
              <option value="removed">已移除</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">运行状态:</span>
            <select
              value={runningFilter}
              onChange={(e) => setRunningFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">全部</option>
              <option value="running">抓取中</option>
              <option value="stopped">已停止</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            多个筛选为「且」关系，同类多选为「或」
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline px-2 py-0.5 rounded hover:bg-primary/10"
            >
              [重置]
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                信息源 <SortIcon field="name" />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => handleSort("type")}>
                类型 <SortIcon field="type" />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                标签
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => handleSort("availability")}>
                可用性 <SortIcon field="availability" />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                运行
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                使用位置
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => handleSort("lastFetch")}>
                最近抓取 <SortIcon field="lastFetch" />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => handleSort("totalNews")}>
                历史新闻 <SortIcon field="totalNews" />
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <Loading />
                </td>
              </tr>
            ) : paginatedSources.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <div className="text-muted-foreground">
                    {hasActiveFilters ? "没有找到匹配的信息源" : "暂无信息源"}
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="mt-2 text-sm text-primary hover:underline">
                      清除筛选条件
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedSources.map((source) => (
                <tr key={source.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/sources/${source.id}`} className="font-medium hover:text-primary hover:underline">
                          {source.name}
                        </Link>
                        {source.type === "X/Twitter" && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">X 同步</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{source.identity}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-primary">{source.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {source.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={tag === "AI" ? "info" : tag === "帖子" ? "warning" : "default"}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        source.availability === "normal" ? "success" :
                        source.availability === "needs-fix" ? "warning" :
                        source.availability === "source-error" ? "error" : "default"
                      }
                    >
                      {availabilityLabels[source.availability]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        source.isRunning ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <span className="text-sm">{source.isRunning ? "抓取中" : "已停止"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {source.placements.length === 0 ? (
                        <span className="text-muted-foreground">未使用</span>
                      ) : (
                        <PlacementTooltip placements={source.placements}>
                          <span className="text-primary hover:underline cursor-pointer">
                            {source.placements.length} 个位置（{source.placements.length} 启用）
                          </span>
                        </PlacementTooltip>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{source.lastFetch}</td>
                  <td className="px-4 py-3 text-sm text-primary">{source.totalNews}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/sources/${source.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      详情
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>共 {filteredSources.length} 条</span>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-background border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="px-3 py-1 bg-primary text-primary-foreground rounded">
            {currentPage}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-background border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>

        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={20}>20 条/页</option>
          <option value={50}>50 条/页</option>
          <option value={100}>100 条/页</option>
        </select>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        data={deleteDialog.data}
        onConfirm={async () => {
          try {
            if (deleteDialog.data?.id) await deleteSource(deleteDialog.data.id);
            await loadSources();
          } catch (e) { console.error(e); }
          setDeleteDialog({ open: false, data: null });
        }}
      />

      {/* Create Source Drawer（仅创建模式，无空间/频道上下文） */}
      <AddSourceDrawer
        open={createDrawer}
        onClose={() => { setCreateDrawer(false); loadSources(); }}
        spaceName=""
        channelName=""
        initialView="create"
        createOnly
      />
    </div>
  );
}
