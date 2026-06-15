import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Label } from "./label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./select";
import { listSpaces, listChannels } from "../../lib/api";

/**
 * 添加展示位置弹窗：把【已知 source】添加到某个空间-频道
 *
 * 设计意图：
 * - 与 AddSourceDrawer 区分：那个是「在 空间-频道 上下文 添加 一个源」语义；
 *   本组件是「为 一个源 添加 一个空间-频道 位置」语义。
 *
 * 复用：
 * - 完全基于 components/ui/ 的 shadcn primitives（Dialog/Select/Button/Label）
 * - 数据走 lib/api（listSpaces / listChannels），调用方只负责拿到结果后调 addDisplayPosition
 *
 * 兼容扩展：
 * - sourceName 可选，仅用于展示「为 X 添加位置」的副标题
 * - existingPlacements 可选，传入后命中的「空间-频道」组合在下拉里禁用，避免重复添加
 * - open / onOpenChange 跟 shadcn Dialog 一致，调用方完全控制
 * - onConfirm 把 (spaceId, channelId | null) 回传给调用方，由调用方调 addDisplayPosition
 *   —— 这样后续如果想批量添加 / 在添加前做校验 / 在不同接口下复用都不需要改本组件
 */
export interface AddPlacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName?: string;
  /** 已有的展示位置，用于禁用重复项；元素需带 space_id / channel_id（来自后端） */
  existingPlacements?: Array<{ space_id?: string | null; channel_id?: string | null }>;
  /** 用户确认后回调：channelId 为 null 表示「全部」（即不指定频道） */
  onConfirm: (spaceId: string, channelId: string | null) => Promise<void> | void;
}

interface SpaceItem { id: string; name: string }
interface ChannelItem { id: string; name: string }

export function AddPlacementDialog({
  open,
  onOpenChange,
  sourceName,
  existingPlacements = [],
  onConfirm,
}: AddPlacementDialogProps) {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [spaceId, setSpaceId] = useState<string>("");
  const [channelId, setChannelId] = useState<string>("__all__");
  const [submitting, setSubmitting] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);

  // 打开时拉空间列表；关闭时重置选项
  useEffect(() => {
    if (!open) {
      setSpaceId("");
      setChannelId("__all__");
      setChannels([]);
      return;
    }
    (async () => {
      try {
        const sp: any[] = await listSpaces();
        setSpaces((sp ?? []).map((s) => ({ id: String(s.id), name: s.name })));
      } catch (e) { console.error(e); }
    })();
  }, [open]);

  // 切空间时拉对应频道；空间未选则清空频道列表
  useEffect(() => {
    if (!spaceId) { setChannels([]); setChannelId("__all__"); return; }
    setChannelsLoading(true);
    (async () => {
      try {
        const ch: any[] = await listChannels(spaceId);
        setChannels((ch ?? []).map((c) => ({ id: String(c.id), name: c.name })));
        setChannelId("__all__");
      } catch (e) { console.error(e); setChannels([]); }
      finally { setChannelsLoading(false); }
    })();
  }, [spaceId]);

  // 校验「这个 空间+频道 组合是不是已经存在」
  const isDuplicate = (sId: string, _cId: string | null): boolean => {
    // 一空间一位置：源已在该空间即视为重复，不区分频道
    return existingPlacements.some((p) => (p.space_id ? String(p.space_id) : "") === sId);
  };

  const targetChannelId = channelId === "__all__" ? null : channelId;
  const duplicate = spaceId ? isDuplicate(spaceId, targetChannelId) : false;
  const canSubmit = !!spaceId && !duplicate && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(spaceId, targetChannelId);
      onOpenChange(false);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加展示位置</DialogTitle>
          <DialogDescription>
            {sourceName
              ? <>为信息源「<span className="font-medium text-foreground">{sourceName}</span>」选择一个空间和频道</>
              : "为当前信息源选择一个空间和频道"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="addplacement-space">空间</Label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger id="addplacement-space" className="w-full">
                <SelectValue placeholder="选择空间..." />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
                {spaces.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">暂无空间</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addplacement-channel">频道</Label>
            <Select value={channelId} onValueChange={setChannelId} disabled={!spaceId}>
              <SelectTrigger id="addplacement-channel" className="w-full">
                <SelectValue placeholder={spaceId ? "选择频道..." : "请先选择空间"} />
              </SelectTrigger>
              <SelectContent>
                {channelsLoading ? (
                  <div className="px-3 py-3 text-center text-sm text-muted-foreground">加载频道中…</div>
                ) : (
                  <>
                    <SelectItem value="__all__">全部（不指定频道）</SelectItem>
                    {channels.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择「全部」表示该位置在空间根目录展示，不绑定任何具体频道。
            </p>
          </div>

          {duplicate && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              该信息源已经在这个空间下了。一个源在一个空间只能有一个位置，不能重复添加。
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            {submitting ? "添加中…" : "添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
