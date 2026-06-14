import { useState, useRef, useEffect } from "react";
import { Plus, MoreHorizontal, Edit2, Trash2, ChevronDown, X, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { AddSourceDrawer } from "./AddSourceDrawer";
import { SpaceEditDialog } from "./SpaceEditDialog";
import { ChannelEditDialog } from "./ChannelEditDialog";
import { Badge } from "../ui/badge";
import { PlacementTooltip } from "../ui/PlacementTooltip";

// Mock data
const mockSpaces = [
  { id: "ai", name: "AI", icon: "🤖", description: "人工智能相关", channelCount: 3, sourceCount: 5 },
  { id: "finance", name: "财经", icon: "💰", description: "财经市场资讯", channelCount: 2, sourceCount: 3 },
  { id: "tech", name: "科技", icon: "💻", description: "科技行业动态", channelCount: 2, sourceCount: 4 },
];

const mockChannels: Record<string, Array<{ id: string; name: string; sourceCount: number; isAll: boolean }>> = {
  ai: [
    { id: "all", name: "全部", sourceCount: 5, isAll: true },
    { id: "models", name: "模型动态", sourceCount: 2, isAll: false },
    { id: "industry", name: "行业资讯", sourceCount: 3, isAll: false },
  ],
  finance: [
    { id: "all", name: "全部", sourceCount: 3, isAll: true },
    { id: "market", name: "市场动态", sourceCount: 2, isAll: false },
  ],
  tech: [
    { id: "all", name: "全部", sourceCount: 4, isAll: true },
    { id: "startup", name: "创业公司", sourceCount: 2, isAll: false },
  ],
};

const mockSources = [
  {
    id: "1",
    name: "Claude code官方账号",
    type: "X/Twitter",
    availability: "normal",
    isRunning: true,
    tags: ["AI", "other", "帖子"],
    identity: "@anthropicai",
    fetchConfig: "最近回应: 4小时前  历史抓取: 20",
    placements: [
      { space: "AI", channel: "模型动态" },
      { space: "科技", channel: "全部" },
    ],
    failureCount: 0,
  },
  {
    id: "2",
    name: "OpenAI官方账号",
    type: "X/Twitter",
    availability: "normal",
    isRunning: true,
    tags: ["AI", "other", "帖子"],
    identity: "@openai",
    fetchConfig: "最近回应: 4小时前  历史抓取: 20",
    placements: [
      { space: "AI", channel: "模型动态" },
    ],
    failureCount: 0,
  },
  {
    id: "3",
    name: "TechCrunch AI",
    type: "RSS",
    availability: "needs-fix",
    isRunning: false,
    tags: ["AI", "新闻"],
    identity: "https://techcrunch.com/category/artificial-intelligence/feed/",
    fetchConfig: "最近回应: 3小时前  历史抓取: 0",
    placements: [
      { space: "AI", channel: "行业资讯" },
    ],
    failureCount: 5,
  },
];

type EditingSpace = { id: string; name: string; icon: string; description: string } | null;
type EditingChannel = { spaceId: string; id: string; name: string } | null;

export function SpacesManagement() {
  const [selectedSpace, setSelectedSpace] = useState("ai");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [hoveredSpace, setHoveredSpace] = useState<string | null>(null);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [spaceEditDialog, setSpaceEditDialog] = useState<{ open: boolean; space: any }>({ open: false, space: null });
  const [channelEditDialog, setChannelEditDialog] = useState<{ open: boolean; channel: any }>({ open: false, channel: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [addSourceDrawer, setAddSourceDrawer] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  const currentSpace = mockSpaces.find(s => s.id === selectedSpace);
  const channels = mockChannels[selectedSpace] || [];
  const currentChannel = channels.find((c) => c.id === selectedChannel);
  const isInAllChannel = selectedChannel === "all";

  // Filter sources based on current channel
  const filteredSources = selectedChannel === "all"
    ? mockSources.filter(s => s.placements.some(p => p.space === currentSpace?.name))
    : mockSources.filter(s =>
        s.placements.some(p => p.space === currentSpace?.name && p.channel === currentChannel?.name)
      );

  const handleSpaceEdit = (space: typeof mockSpaces[0] | null) => {
    setSpaceEditDialog({ open: true, space });
  };

  const handleSpaceSave = (data: { name: string; icon: string; description: string }) => {
    console.log("Save space", data);
    // Save logic here
  };

  const handleSpaceDelete = (space: typeof mockSpaces[0]) => {
    setDeleteDialog({
      open: true,
      data: {
        type: "space",
        name: space.name,
        channelCount: space.channelCount,
        placementCount: 15,
        newsCount: 1247,
      },
    });
  };

  const handleChannelEdit = (channel: typeof channels[0] | null) => {
    if (channel?.isAll) return;
    setChannelEditDialog({
      open: true,
      channel: channel ? { id: channel.id, name: channel.name, description: "" } : null
    });
  };

  const handleChannelSave = (data: { name: string; description: string }) => {
    console.log("Save channel", data);
    // Check for duplicates and save
  };

  const handleChannelDelete = (channel: typeof channels[0]) => {
    setDeleteDialog({
      open: true,
      data: {
        type: "channel",
        name: channel.name,
        spaceName: currentSpace?.name,
        placementCount: channel.sourceCount,
        sourceCount: channel.sourceCount,
        newsCount: 892,
        hasConflicts: false,
      },
    });
  };

  const handleSourceRemove = (source: typeof mockSources[0]) => {
    setSourceToDelete(source.id);
    setDeleteDialog({
      open: true,
      data: {
        type: "remove-placement",
        sourceName: source.name,
        location: `${currentSpace?.name} / ${currentChannel?.name}`,
        isLastPlacement: source.placements.length === 1,
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
          {mockSpaces.map((space, idx) => (
            <div
              key={space.id}
              onMouseEnter={() => setHoveredSpace(space.id)}
              onMouseLeave={() => setHoveredSpace(null)}
              className="relative"
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
                            console.log("Move left");
                          }}
                          className="absolute -left-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      )}
                      {idx < mockSpaces.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Move right");
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
                          console.log("Move up");
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
                          console.log("Move down");
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
            {filteredSources.length === 0 ? (
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
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1">
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
                        <button className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm">
                          暂停
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
                                  onValueChange={(value) => {
                                    console.log("Change channel to", value);
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
        onConfirm={(migrateToRoot) => {
          console.log("Confirm action", deleteDialog.data?.type, migrateToRoot);
          if (deleteDialog.data?.type === "remove-placement") {
            console.log("Removing source from placement", sourceToDelete);
            // TODO: Remove source from current space/channel
          }
          setDeleteDialog({ open: false, data: null });
          setSourceToDelete(null);
        }}
      />

      {/* Add Source Drawer */}
      <AddSourceDrawer
        open={addSourceDrawer}
        onClose={() => setAddSourceDrawer(false)}
        spaceName={currentSpace?.name || ""}
        channelName={currentChannel?.name || ""}
        onAddSource={(sourceId) => {
          console.log("Add source", sourceId);
        }}
      />
    </div>
  );
}
