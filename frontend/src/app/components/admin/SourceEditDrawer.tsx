import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SourceEditDrawerProps {
  open: boolean;
  onClose: () => void;
  source: {
    id: string;
    name: string;
    type: string;
    identity: string;
    tags: string[];
    role: string;
    priority: string;
    topic: string;
    notes: string;
  } | null;
  onSave: (data: any) => void | Promise<void>;
}

export function SourceEditDrawer({ open, onClose, source, onSave }: SourceEditDrawerProps) {
  const [displayName, setDisplayName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [role, setRole] = useState("");
  const [priority, setPriority] = useState("中");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // X 源的展示名由 X Developer Portal Tag 同步管理，UI 不可编辑（后端会 400）
  const isXSource = source?.type === "X/Twitter" || source?.type === "x_twitter";

  useEffect(() => {
    if (source) {
      setDisplayName(source.name);
      setTags(source.tags);
      setTagInput("");
      setRole(source.role || "");
      setPriority(source.priority || "中");
      setTopic(source.topic || "");
      setNotes(source.notes || "");
      setSubmitting(false);
    }
  }, [source, open]);

  const handleSave = async () => {
    if (!isXSource && !displayName.trim()) {
      toast.error("请输入展示名称");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      // 兜底：用户输入标签后未按回车直接保存时，把输入框残留文字也并入，避免内容丢失
      const trimmed = tagInput.trim();
      const finalTags = trimmed && !tags.includes(trimmed) ? [...tags, trimmed] : tags;
      // 等后端完成再关；X 源不传 displayName，避免后端 400
      await onSave({
        displayName: isXSource ? undefined : displayName.trim(),
        tags: finalTags,
        role,
        priority,
        topic,
        notes,
      });
      onClose();
    } catch {
      // 父级已 toast.error，留住抽屉让用户重试或取消
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !source) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => { if (!submitting) onClose(); }} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[500px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3>编辑信息源</h3>
          <button onClick={onClose} disabled={submitting} className="p-1 hover:bg-accent rounded disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">类型</label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">{source.type}</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">来源身份</label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
              {source.identity}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">展示名称{isXSource ? "" : " *"}</label>
            {isXSource ? (
              <>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">{displayName || "—"}</div>
                <p className="text-xs text-muted-foreground mt-1">X 信息源的展示名由 X Developer Portal Tag 同步，不可在此修改</p>
              </>
            ) : (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">领域标签</label>
            <input
              type="text"
              placeholder="输入标签后按回车添加（直接保存也会自动收录）"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const v = tagInput.trim();
                  if (v && !tags.includes(v)) setTags([...tags, v]);
                  setTagInput("");
                }
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm flex items-center gap-1"
                  >
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">来源角色</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="如：媒体、个人"
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">关注级别</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">内容主题</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="简要描述内容方向"
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </>
  );
}
