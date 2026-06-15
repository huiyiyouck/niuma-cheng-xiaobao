import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loading } from "../ui/Loading";
import { Plus, MoreHorizontal, Edit2, Trash2, ChevronDown, X, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { AddSourceDrawer } from "./AddSourceDrawer";
import { SpaceEditDialog } from "./SpaceEditDialog";
import { ChannelEditDialog } from "./ChannelEditDialog";
import { Badge } from "../ui/badge";
import { PlacementTooltip } from "../ui/PlacementTooltip";
import {
  listSpaces, createSpace, updateSpace, deleteSpace, reorderSpaces,
  listChannels, createChannel, updateChannel, deleteChannel, reorderChannels,
  listSpaceSources, pauseSource, resumeSource,
  addDisplayPosition, removeDisplayPosition, moveDisplayPosition,
} from "../../lib/api";

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

// 后端 space → 原型 shape（驼峰）
function mapSpace(s: any) {
  return {
    id: String(s.id),
    name: s.name,
    icon: s.icon ?? "📁",
    description: s.description ?? "",
    channelCount: s.channel_count ?? 0,
    sourceCount: s.source_count ?? 0,
  };
}
// 后端 channel → 原型 shape
function mapChannel(c: any) {
  return { id: String(c.id), name: c.name, sourceCount: c.source_count ?? 0, isAll: false, description: c.description ?? "" };
}
// listSpaceSources 聚合源 → 原型 shape（positions 端口 space_name 为空，用当前空间名兜底）
function mapSpaceSource(s: any, spaceName: string) {
  const positions = Array.isArray(s.display_positions) ? s.display_positions : [];
  return {
    id: String(s.id),
    name: s.display_name ?? "",
    type: mapType(s.type),
    availability: s.availability_status === "normal" ? "normal" : "needs-fix",
    isRunning: !s.paused,
    tags: Array.isArray(s.domain_tags) ? s.domain_tags : [],
    identity: s.source_identity ?? "",
    fetchConfig: `最近抓取: ${fmtAgo(s.last_fetched_at)}  历史新闻: ${s.total_news_count ?? 0}`,
    placements: positions.map((p: any) => ({ space: spaceName, channel: p.channel_name ?? "" })),
    failureCount: s.consecutive_failures ?? 0,
    _positions: positions,
  };
}

export function SpacesManagement() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [channels, setChannels] = useState<any[]>([{ id: "all", name: "全部", sourceCount: 0, isAll: true }]);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [hoveredSpace, setHoveredSpace] = useState<string | null>(null);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [spaceEditDialog, setSpaceEditDialog] = useState<{ open: boolean; space: any }>({ open: false, space: null });
  const [channelEditDialog, setChannelEditDialog] = useState<{ open: boolean; channel: any }>({ open: false, channel: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [addSourceDrawer, setAddSourceDrawer] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  const currentSpace = spaces.find((s) => s.id === selectedSpace);
  const currentChannel = channels.find((c) => c.id === selectedChannel);
  const isInAllChannel = selectedChannel === "all";

  // 加载空间列表（mount / 增删改后）
  async function loadSpaces() {
    try {
      const sp: any[] = await listSpaces();
      const list = (sp ?? []).map(mapSpace);
      setSpaces(list);
      setSelectedSpace((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? ""));
    } catch (e) { console.error(e); }
  }
  // 加载当前空间频道（前端补「全部」）
  async function loadChannels() {
    if (!selectedSpace) return;
    const sp = spaces.find((s) => s.id === selectedSpace);
    try {
      const ch: any[] = await listChannels(selectedSpace);
      setChannels([{ id: "all", name: "全部", sourceCount: sp?.sourceCount ?? 0, isAll: true }, ...(ch ?? []).map(mapChannel)]);
    } catch { setChannels([{ id: "all", name: "全部", sourceCount: 0, isAll: true }]); }
  }
  // 加载当前空间/频道下的信息源
  async function loadSources() {
    if (!selectedSpace) { setSources([]); setSourcesLoading(false); return; }
    const sp = spaces.find((s) => s.id === selectedSpace);
    setSourcesLoading(true);
    try {
      const raw = await listSpaceSources(selectedSpace, selectedChannel === "all" ? null : selectedChannel);
      setSources(raw.map((s) => mapSpaceSource(s, sp?.name ?? "")));
    } catch { setSources([]); }
    finally { setSourcesLoading(false); }
  }

  useEffect(() => { loadSpaces(); }, []);
  useEffect(() => { setSelectedChannel("all"); loadChannels(); }, [selectedSpace]);
  useEffect(() => { loadSources(); }, [selectedSpace, selectedChannel]);

  // 信息源已按空间/频道从后端加载，直接用
  const filteredSources = sources;

  // 空间排序
  async function moveSpace(idx: number, dir: -1 | 1) {
    const arr = [...spaces];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    try { await reorderSpaces(arr.map((s, i) => ({ id: s.id, sort_order: (i + 1) * 10 }))); await loadSpaces(); } catch (e) { console.error(e); }
  }
  // 频道排序（channels[0] 是前端造的「全部」，不参与）
  async function moveChannel(idx: number, dir: -1 | 1) {
    const arr = [...channels];
    const j = idx + dir;
    if (j < 1 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const real = arr.filter((c) => !c.isAll);
    try { await reorderChannels(selectedSpace, real.map((c, i) => ({ id: c.id, sort_order: (i + 1) * 10 }))); await loadChannels(); } catch (e) { console.error(e); }
  }
  // 暂停 / 恢复（乐观更新：立即翻转状态，失败回滚）
  async function toggleSourcePause(source: any) {
    const wasRunning = source.isRunning;
    setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, isRunning: !wasRunning } : s)));
    try {
      if (wasRunning) await pauseSource(source.id); else await resumeSource(source.id);
      toast.success(wasRunning ? "已暂停抓取" : "已恢复抓取");
    } catch (e) {
      console.error(e);
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, isRunning: wasRunning } : s)));
      toast.error("操作失败，请重试");
    }
  }

  // 空间拖拽排序（乐观：立即重排，失败回滚重拉）
  function handleSpaceDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
    const arr = [...spaces];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    setDragIdx(null);
    setSpaces(arr);
    reorderSpaces(arr.map((s, i) => ({ id: s.id, sort_order: (i + 1) * 10 }))).catch((e) => { console.error(e); loadSpaces(); });
  }

  const handleSpaceEdit = (space: any | null) => {
    setSpaceEditDialog({ open: true, space });
  };

  const handleSpaceSave = async (data: { name: string; icon: string; description: string }) => {
    try {
      if (spaceEditDialog.space?.id) {
        await updateSpace(spaceEditDialog.space.id, { name: data.name, description: data.description, icon: data.icon });
        await loadSpaces();
        toast.success("空间已更新");
      } else {
        // 新建：append 到末尾并选中（不全量重拉，避免卡顿和跳到第一位）
        const created: any = await createSpace({ name: data.name, description: data.description, icon: data.icon });
        const ns = mapSpace(created);
        setSpaces((prev) => [...prev, ns]);
        setSelectedSpace(ns.id);
        toast.success("空间已创建");
      }
    } catch (e) { console.error(e); toast.error("操作失败，请重试"); }
  };

  const handleSpaceDelete = (space: any) => {
    setDeleteDialog({
      open: true,
      data: {
        type: "space",
        id: space.id,
        name: space.name,
        channelCount: space.channelCount,
        placementCount: space.sourceCount,
        newsCount: 0,
      },
    });
  };

  const handleChannelEdit = (channel: any | null) => {
    if (channel?.isAll) return;
    setChannelEditDialog({
      open: true,
      channel: channel ? { id: channel.id, name: channel.name, description: channel.description ?? "" } : null
    });
  };

  const handleChannelSave = async (data: { name: string; description: string }) => {
    try {
      const isEdit = !!channelEditDialog.channel?.id;
      if (isEdit) await updateChannel(selectedSpace, channelEditDialog.channel.id, { name: data.name, description: data.description });
      else await createChannel(selectedSpace, { name: data.name, description: data.description });
      await loadChannels();
      await loadSpaces();
      toast.success(isEdit ? "频道已更新" : "频道已创建");
    } catch (e) { console.error(e); toast.error("操作失败，请重试"); }
  };

  const handleChannelDelete = (channel: any) => {
    setDeleteDialog({
      open: true,
      data: {
        type: "channel",
        id: channel.id,
        name: channel.name,
        spaceName: currentSpace?.name,
        placementCount: channel.sourceCount,
        sourceCount: channel.sourceCount,
        newsCount: 0,
        hasConflicts: false,
      },
    });
  };

  const handleSourceRemove = (source: any) => {
    setSourceToDelete(source.id);
    setDeleteDialog({
      open: true,
      data: {
        type: "remove-placement",
        sourceName: source.name,
        location: `${currentSpace?.name} / ${currentChannel?.name}`,
        isLastPlacement: (source._positions?.length ?? 0) <= 1,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Spaces Row */}
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium">空间</h4>
          <button className="p-1 hover:bg-accent rounded">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          {spaces.map((space, idx) => (
            <div
              key={space.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleSpaceDrop(idx)}
              onDragEnd={() => setDragIdx(null)}
              onMouseEnter={() => setHoveredSpace(space.id)}
              onMouseLeave={() => setHoveredSpace(null)}
              className={cn("relative transition-opacity", dragIdx === idx && "opacity-40")}
            >
              <div
                onClick={() => {
                  setSelectedSpace(space.id);
                  setSelectedChannel("all");
                }}
                onDoubleClick={() => handleSpaceEdit(space)}
                className={cn(
                    "w-[180px] p-3 rounded-lg border-2 transition-all text-left relative cursor-pointer",
                    selectedSpace === space.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="text-2xl">{space.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{space.name}</div>
                    </div>
                    {selectedSpace === space.id && (
                      <div className="flex gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpaceEdit(space);
                          }}
                          className="p-0.5 hover:bg-accent rounded"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpaceDelete(space);
                          }}
                          className="p-0.5 hover:bg-accent rounded text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {space.channelCount}个频道 · {space.sourceCount}个信息源
                  </div>

                  {/* Sort arrows */}
                  {hoveredSpace === space.id && (
                    <>
                      {idx > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSpace(idx, -1);
                          }}
                          className="absolute -left-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      )}
                      {idx < spaces.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSpace(idx, 1);
                          }}
                          className="absolute -right-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
            </div>
          ))}

          <button
            onClick={() => handleSpaceEdit(null)}
            className="w-[180px] p-3 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            <span>新建空间</span>
          </button>
        </div>
      </div>

      {/* Content Area: Channels + Sources */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Channels */}
        <div className="w-56 border-r border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">频道</h4>
            <button className="p-1 hover:bg-accent rounded">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            {channels.map((channel, idx) => (
              <div
                key={channel.id}
                onMouseEnter={() => setHoveredChannel(channel.id)}
                onMouseLeave={() => setHoveredChannel(null)}
                className="relative"
              >
                <button
                  onClick={() => setSelectedChannel(channel.id)}
                  onDoubleClick={() => handleChannelEdit(channel)}
                  className={cn(
                    "w-full px-3 py-2 rounded-md transition-colors text-left text-sm",
                    selectedChannel === channel.id
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "hover:bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{channel.name}</span>
                    <div className="flex items-center gap-2">
                      {!channel.isAll && (
                        <span className="text-xs text-muted-foreground">{channel.sourceCount}</span>
                      )}
                      {selectedChannel === channel.id && !channel.isAll && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChannelDelete(channel);
                          }}
                          className="p-0.5 hover:bg-accent rounded text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </button>

                {/* Sort arrows for non-all channels */}
                {!channel.isAll && hoveredChannel === channel.id && (
                  <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    {idx > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveChannel(idx, -1);
                        }}
                        className="p-0.5 hover:bg-accent rounded"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                    )}
                    {idx < channels.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveChannel(idx, 1);
                        }}
                        className="p-0.5 hover:bg-accent rounded"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => handleChannelEdit(null)}
              className="w-full px-3 py-2 rounded-md hover:bg-accent text-left text-sm text-primary"
            >
              <Plus className="h-3 w-3 inline mr-2" />
              新建频道
            </button>
          </div>
        </div>

        {/* Right: Sources */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">当前:</span>
                <span className="text-primary">{currentSpace?.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-primary">{currentChannel?.name}</span>
                <span className="text-muted-foreground">
                  {filteredSources.length}个信息源
                </span>
              </div>
              <button
                onClick={() => setAddSourceDrawer(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                添加信息源
              </button>
            </div>

            {/* Sources List */}
            {sourcesLoading ? (
              <Loading text="加载信息源…" />
            ) : filteredSources.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">当前频道暂无信息源</p>
                <button
                  onClick={() => setAddSourceDrawer(true)}
                  className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  添加第一个信息源
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSources.map((source) => (
                  <div key={source.id} className="bg-card border border-border rounded-lg p-4">
                    {/* Source Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{source.name}</h4>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            {source.type}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 text-xs rounded",
                            source.availability === "normal" && "bg-green-100 text-green-800",
                            source.availability === "needs-fix" && "bg-orange-100 text-orange-800"
                          )}>
                            {source.availability === "normal" ? "正常" : "待修复"}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 text-xs rounded flex items-center gap-1",
                            source.isRunning ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-500"
                          )}>
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              source.isRunning ? "bg-green-600" : "bg-gray-400"
                            )} />
                            {source.isRunning ? "抓取中" : "已停止"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap text-sm">
                          {source.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          <span className="text-muted-foreground">
                            身份: {source.identity}
                          </span>
                          <span className="text-muted-foreground">
                            {source.fetchConfig}
                          </span>
                        </div>

                        {/* Placements info - only show in "All" view */}
                        {isInAllChannel && (
                          <PlacementTooltip placements={source.placements}>
                            <span className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
                              使用于 {source.placements.length} 个位置
                            </span>
                          </PlacementTooltip>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        <button className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm">
                          详情
                        </button>
                        <button
                          onClick={() => toggleSourcePause(source)}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm"
                        >
                          {source.isRunning ? "暂停" : "恢复"}
                        </button>

                        {/* Channel display/selector */}
                        {isInAllChannel ? (
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm flex items-center gap-1">
                                {source.placements.find(p => p.space === currentSpace?.name)?.channel || "未分配"}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content className="min-w-[160px] bg-popover border border-border rounded-md shadow-lg p-1 z-50">
                                <DropdownMenu.RadioGroup
                                  value={source.placements.find(p => p.space === currentSpace?.name)?.channel || ""}
                                  onValueChange={async (value) => {
                                    try {
                                      const pos = source._positions?.[0];
                                      const ch = channels.find((c) => c.name === value && !c.isAll);
                                      if (pos && ch) { await moveDisplayPosition(pos.id, ch.id); await loadSources(); await loadChannels(); }
                                    } catch (e) { console.error(e); }
                                  }}
                                >
                                  {channels
                                    .filter(c => !c.isAll)
                                    .map((channel) => (
                                      <DropdownMenu.RadioItem
                                        key={channel.id}
                                        value={channel.name}
                                        className="px-3 py-2 text-sm rounded hover:bg-accent cursor-pointer outline-none flex items-center gap-2"
                                      >
                                        <DropdownMenu.ItemIndicator className="w-4">
                                          ●
                                        </DropdownMenu.ItemIndicator>
                                        {channel.name}
                                      </DropdownMenu.RadioItem>
                                    ))}
                                </DropdownMenu.RadioGroup>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        ) : (
                          <span className="px-3 py-1.5 bg-muted text-muted-foreground rounded text-sm">
                            当前频道: {currentChannel?.name}
                          </span>
                        )}

                        <button
                          onClick={() => handleSourceRemove(source)}
                          className="px-3 py-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 text-sm"
                        >
                          从此位置移除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Space Edit Dialog */}
      <SpaceEditDialog
        open={spaceEditDialog.open}
        onOpenChange={(open) => setSpaceEditDialog({ ...spaceEditDialog, open })}
        space={spaceEditDialog.space}
        onSave={handleSpaceSave}
      />

      {/* Channel Edit Dialog */}
      <ChannelEditDialog
        open={channelEditDialog.open}
        onOpenChange={(open) => setChannelEditDialog({ ...channelEditDialog, open })}
        channel={channelEditDialog.channel}
        onSave={handleChannelSave}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        data={deleteDialog.data}
        onConfirm={async () => {
          const d = deleteDialog.data;
          const removedSourceId = sourceToDelete;
          // 立即关弹窗 + 乐观移除，消除等待感
          setDeleteDialog({ open: false, data: null });
          setSourceToDelete(null);
          if (d?.type === "space") setSpaces((prev) => prev.filter((s) => s.id !== d.id));
          else if (d?.type === "channel") setChannels((prev) => prev.filter((c) => c.id !== d.id));
          else if (d?.type === "remove-placement") setSources((prev) => prev.filter((s) => s.id !== removedSourceId));
          try {
            if (d?.type === "space") { await deleteSpace(d.id); await loadSpaces(); }
            else if (d?.type === "channel") { await deleteChannel(selectedSpace, d.id); await loadChannels(); await loadSpaces(); }
            else if (d?.type === "remove-placement") {
              const src = sources.find((s) => s.id === removedSourceId);
              const positions = isInAllChannel
                ? (src?._positions ?? [])
                : (src?._positions ?? []).filter((p: any) => String(p.channel_id) === selectedChannel);
              for (const p of positions) await removeDisplayPosition(p.id);
              await loadSources(); await loadChannels();
            }
            toast.success("已删除");
          } catch (e) { console.error(e); toast.error("删除失败，请重试"); loadSpaces(); loadChannels(); loadSources(); }
        }}
      />

      {/* Add Source Drawer */}
      <AddSourceDrawer
        open={addSourceDrawer}
        onClose={() => setAddSourceDrawer(false)}
        spaceName={currentSpace?.name || ""}
        channelName={currentChannel?.name || ""}
        onAddSource={async (sourceId) => {
          try {
            await addDisplayPosition({ source_id: sourceId, space_id: selectedSpace, channel_id: isInAllChannel ? null : selectedChannel });
            await loadSources();
            await loadChannels();
            await loadSpaces();
            toast.success("信息源已添加");
          } catch (e) { console.error(e); toast.error("添加失败，请重试"); }
        }}
      />
    </div>
  );
}
