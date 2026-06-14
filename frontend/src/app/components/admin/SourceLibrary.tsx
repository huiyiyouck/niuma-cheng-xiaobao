import { useState } from "react";
import { Link } from "react-router";
import { Plus, RefreshCw, Download, ExternalLink, Trash2, ChevronUp, ChevronDown, Repeat } from "lucide-react";
import { cn } from "../../lib/utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Badge } from "../ui/badge";
import { PlacementTooltip } from "../ui/PlacementTooltip";

type SortField = "name" | "type" | "availability" | "lastFetch" | "totalNews";
type SortDirection = "asc" | "desc";

const mockSources = [
  {
    id: "1",
    name: "Claude code官方账号",
    identity: "anthropicai",
    type: "X/Twitter",
    tags: ["其他", "帖子"],
    availability: "normal",
    isRunning: true,
    placements: [
      { space: "AI", channel: "行业资讯" },
      { space: "科技", channel: "全部" },
    ],
    lastFetch: "2小时前",
    totalNews: 21,
  },
  {
    id: "2",
    name: "加密狗",
    identity: "jiamigou",
    type: "X/Twitter",
    tags: ["其他", "帖子"],
    availability: "normal",
    isRunning: true,
    placements: [
      { space: "AI", channel: "行业资讯" },
    ],
    lastFetch: "2小时前",
    totalNews: 19,
  },
  {
    id: "3",
    name: "Solanamobile官方账号",
    identity: "solanamobile",
    type: "X/Twitter",
    tags: ["其他", "帖子"],
    availability: "normal",
    isRunning: true,
    placements: [
      { space: "财经", channel: "市场动态" },
      { space: "财经", channel: "全部" },
    ],
    lastFetch: "2小时前",
    totalNews: 28,
  },
  {
    id: "4",
    name: "OpenAI官方账号",
    identity: "openai",
    type: "X/Twitter",
    tags: ["AI", "其他", "帖子"],
    availability: "normal",
    isRunning: true,
    placements: [
      { space: "AI", channel: "模型动态" },
    ],
    lastFetch: "2小时前",
    totalNews: 21,
  },
];

const availabilityLabels: Record<string, string> = {
  normal: "正常",
  "needs-fix": "待修复",
  "source-error": "来源异常",
  removed: "已移除",
};

export function SourceLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [runningFilter, setRunningFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; data: any }>({ open: false, data: null });

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

  const filteredSources = mockSources.filter((source) => {
    if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter !== "all" && source.type !== typeFilter) return false;
    if (availabilityFilter !== "all" && source.availability !== availabilityFilter) return false;
    if (runningFilter === "running" && !source.isRunning) return false;
    if (runningFilter === "stopped" && source.isRunning) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredSources.length / perPage);
  const paginatedSources = filteredSources.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDeleteSource = (source: typeof mockSources[0]) => {
    setDeleteDialog({
      open: true,
      data: {
        type: "source",
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
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 whitespace-nowrap">
          <Plus className="h-4 w-4 inline mr-2" />
          新建信息源
        </button>
        <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent whitespace-nowrap">
          <RefreshCw className="h-4 w-4 inline mr-2" />
          刷新
        </button>
        <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent whitespace-nowrap">
          <Repeat className="h-4 w-4 inline mr-2" />
          同步 X 规则
        </button>
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
      <div className="bg-card border border-border rounded-lg overflow-hidden">
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
            {paginatedSources.length === 0 ? (
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
        onConfirm={() => {
          console.log("Delete confirmed");
          setDeleteDialog({ open: false, data: null });
        }}
      />
    </div>
  );
}
