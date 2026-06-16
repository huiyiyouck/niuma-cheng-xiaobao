import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loading } from "../ui/Loading";
import { Plus, MoreHorizontal, Edit2, Trash2, ChevronDown, X } from "lucide-react";
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
    sort_order: Number(s.sort_order ?? 0),
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
  const [spacesLoading, setSpacesLoading] = useState(true);
  const [spaceDragIdx, setSpaceDragIdx] = useState<number | null>(null);
  const [spaceDragOverIdx, setSpaceDragOverIdx] = useState<number | null>(null);
  const [channels, setChannels] = useState<any[]>([{ id: "all", name: "全部", sourceCount: 0, isAll: true }]);
  const [channelDragIdx, setChannelDragIdx] = useState<number | null>(null);
  const [channelDragOverIdx, setChannelDragOverIdx] = useState<number | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("all");
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
    setSpacesLoading(true);
    try {
      const sp: any[] = await listSpaces();
      const list = (sp ?? []).map(mapSpace);
      setSpaces(list);
      setSelectedSpace((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? ""));
    } catch (e) { console.error(e); }
    finally { setSpacesLoading(false); }
  }
  // 加载当前空间频道（前端补「全部」）
  async function loadChannels() {
    if (!selectedSpace) return;
    const sp = spaces.find((s) => s.id === selectedSpace);
    setChannelsLoading(true);
    try {
      const ch: any[] = await listChannels(selectedSpace);
      setChannels([{ id: "all", name: "全部", sourceCount: sp?.sourceCount ?? 0, isAll: true }, ...(ch ?? []).map(mapChannel)]);
    } catch { setChannels([{ id: "all", name: "全部", sourceCount: 0, isAll: true }]); }
    finally { setChannelsLoading(false); }
  }
  // 加载当前空间/频道下的信息源
  async function loadSources() {
    if (!selectedSpace) { setSources([]); return; }  // 空间未就绪时保持 loading，不闪空态
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

  // 频道拖拽排序（channels[0] 是前端造的「全部」，不参与）
  function handleChannelDrop(targetIdx: number) {
    setChannelDragOverIdx(null);
    if (channelDragIdx === null || channelDragIdx === targetIdx || targetIdx < 1 || channelDragIdx < 1) {
      setChannelDragIdx(null); return;
    }
    const arr = [...channels];
    const [moved] = arr.splice(channelDragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    setChannelDragIdx(null);
    setChannels(arr);
    const real = arr.filter((c) => !c.isAll);
    reorderChannels(selectedSpace, real.map((c, i) => ({ id: c.id, sort_order: (i + 1) * 10 })))
      .catch((e) => { console.error(e); loadChannels(); });
  }
  // 暂停 / 恢复（乐观更新：立即翻转状态，失败回滚）
  async function toggleSourcePause(source: any) {
    const wasRunning = source.isRunning;
    setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, isRunning: !wasRunning } : s)));
    toast.success(wasRunning ? "已暂停抓取" : "已恢复抓取");  // 与乐观更新同步弹出
    try {
      if (wasRunning) await pauseSource(source.id); else await resumeSource(source.id);
    } catch (e) {
      console.error(e);
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, isRunning: wasRunning } : s)));
      toast.error("操作失败，已撤销");
    }
  }

  // 空间拖拽排序（乐观：立即重排，失败回滚重拉）
  function handleSpaceDrop(targetIdx: number) {
    setSpaceDragOverIdx(null);
    if (spaceDragIdx === null || spaceDragIdx === targetIdx) { setSpaceDragIdx(null); return; }
    const arr = [...spaces];
    const [moved] = arr.splice(spaceDragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    setSpaceDragIdx(null);
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
        // 新建：传 sort_order = max+10 让其稳定排在末尾（后端按 sort_order 升序），并立即 append + 选中
        const maxSort = spaces.reduce((m, s) => Math.max(m, Number(s.sort_order ?? 0)), 0);
        const created: any = await createSpace({ name: data.name, description: data.description, icon: data.icon, sort_order: maxSort + 10 });
        const ns = mapSpace(created);
        setSpaces((prev) => [...prev, ns]);
        setSelectedSpace(ns.id);
        toast.success("空间已创建");
      }
    } catch (e) { console.error(e); toast.error("操作失败，请重试"); throw e; }
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
    } catch (e) { console.error(e); toast.error("操作失败，请重试"); throw e; }
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

        {spacesLoading ? (
          <Loading text="加载空间…" className="py-8" />
        ) : (
        <div className="flex gap-3 flex-wrap">
          {spaces.map((space, idx) => (
            <div
              key={space.id}
              draggable
              onDragStart={(e) => {
                setSpaceDragIdx(idx);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (spaceDragIdx !== null && spaceDragIdx !== idx) setSpaceDragOverIdx(idx);
              }}
              onDragLeave={() => setSpaceDragOverIdx((cur) => (cur === idx ? null : cur))}
              onDrop={() => handleSpaceDrop(idx)}
              onDragEnd={() => { setSpaceDragIdx(null); setSpaceDragOverIdx(null); }}
              className={cn(
                "relative transition-all duration-200 cursor-grab active:cursor-grabbing",
                spaceDragIdx === idx && "opacity-50 scale-95",
                spaceDragOverIdx === idx && spaceDragIdx !== idx && "scale-105",
              )}
            >
              {/* 拖拽插入指示线（左侧） */}
              {spaceDragOverIdx === idx && spaceDragIdx !== null && spaceDragIdx > idx && (
                <span className="absolute -left-2 top-0 h-full w-0.5 bg-primary rounded-full" />
              )}
              {/* 拖拽插入指示线（右侧） */}
              {spaceDragOverIdx === idx && spaceDragIdx !== null && spaceDragIdx < idx && (
                <span className="absolute -right-2 top-0 h-full w-0.5 bg-primary rounded-full" />
              )}
              <div
                onClick={() => {
                  setSelectedSpace(space.id);
                  setSelectedChannel("all");
                }}
                onDoubleClick={() => handleSpaceEdit(space)}
                className={cn(
                    "w-[180px] p-3 rounded-lg border-2 transition-all text-left relative",
                    spaceDragIdx === idx
                      ? "border-primary shadow-xl ring-2 ring-primary/30 bg-primary/5"
                      : selectedSpace === space.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
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
        )}
      </div>

      {/* Content Area: Channels + Sources（空间未就绪不渲染，消除多 spinner 并存） */}
      {!spacesLoading && (
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Channels */}
        <div className="w-56 border-r border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">频道</h4>
            <button className="p-1 hover:bg-accent rounded">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            {channelsLoading && <Loading className="py-6" />}
            {!channelsLoading && channels.map((channel, idx) => (
              <div
                key={channel.id}
                draggable={!channel.isAll}
                onDragStart={(e) => {
                  if (channel.isAll) return;
                  setChannelDragIdx(idx);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (channel.isAll || channelDragIdx === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (channelDragIdx !== idx) setChannelDragOverIdx(idx);
                }}
                onDragLeave={() => setChannelDragOverIdx((cur) => (cur === idx ? null : cur))}
                onDrop={() => handleChannelDrop(idx)}
                onDragEnd={() => { setChannelDragIdx(null); setChannelDragOverIdx(null); }}
                className={cn(
                  "relative transition-all duration-200",
                  !channel.isAll && "cursor-grab active:cursor-grabbing",
                  channelDragIdx === idx && "opacity-50",
                )}
              >
                {/* 拖拽插入指示线 */}
                {channelDragOverIdx === idx && channelDragIdx !== null && channelDragIdx > idx && (
                  <span className="absolute left-0 -top-0.5 w-full h-0.5 bg-primary rounded-full" />
                )}
                {channelDragOverIdx === idx && channelDragIdx !== null && channelDragIdx < idx && (
                  <span className="absolute left-0 -bottom-0.5 w-full h-0.5 bg-primary rounded-full" />
                )}
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
                  <div key={source.id} className="bg-card border border-border rounded-lg shadow-sm p-4">
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
      )}

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
          // 等后端完成再关弹窗 + 本地更新（不全量重拉，避免父级 loading 兜底闪动）
          try {
            if (d?.type === "space") {
              await deleteSpace(d.id);
              setSpaces((prev) => {
                const next = prev.filter((s) => s.id !== d.id);
                // 当前选中被删 → 选首个；否则保持
                setSelectedSpace((cur) => (cur === d.id ? (next[0]?.id ?? "") : cur));
                return next;
              });
            } else if (d?.type === "channel") {
              await deleteChannel(selectedSpace, d.id);
              setChannels((prev) => prev.filter((c) => c.id !== d.id));
              if (selectedChannel === d.id) setSelectedChannel("all");
              // 频道删除后空间的频道/源数会变，静默刷新（非父级 loading）
              listSpaces().then((sp: any[]) => setSpaces((sp ?? []).map(mapSpace))).catch(() => {});
            } else if (d?.type === "remove-placement") {
              const src = sources.find((s) => s.id === removedSourceId);
              const positions = isInAllChannel
                ? (src?._positions ?? [])
                : (src?._positions ?? []).filter((p: any) => String(p.channel_id) === selectedChannel);
              for (const p of positions) await removeDisplayPosition(p.id);
              setSources((prev) => prev.filter((s) => s.id !== removedSourceId));
              // 频道下源数 / 空间汇总数变化，静默刷新
              loadChannels();
              listSpaces().then((sp: any[]) => setSpaces((sp ?? []).map(mapSpace))).catch(() => {});
            }
            setDeleteDialog({ open: false, data: null });
            setSourceToDelete(null);
            toast.success("已删除");
          } catch (e) {
            console.error(e);
            toast.error("删除失败，请重试");
            throw e;  // 让弹窗 submitting 状态退出但不关闭，用户可重试或取消
          }
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
