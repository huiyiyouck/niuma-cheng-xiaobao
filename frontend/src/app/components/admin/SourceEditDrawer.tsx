import { useState, useEffect } from "react";
import { X } from "lucide-react";

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
  onSave: (data: any) => void;
}

export function SourceEditDrawer({ open, onClose, source, onSave }: SourceEditDrawerProps) {
  const [displayName, setDisplayName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [priority, setPriority] = useState("中");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (source) {
      setDisplayName(source.name);
      setTags(source.tags);
      setRole(source.role || "");
      setPriority(source.priority || "中");
      setTopic(source.topic || "");
      setNotes(source.notes || "");
    }
  }, [source, open]);

  const handleSave = () => {
    if (!displayName.trim()) {
      alert("请输入展示名称");
      return;
    }
    onSave({
      displayName: displayName.trim(),
      tags,
      role,
      priority,
      topic,
      notes,
    });
    onClose();
  };

  if (!open || !source) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[500px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3>编辑信息源</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
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
            <label className="block text-sm font-medium mb-2">展示名称 *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">领域标签</label>
            <input
              type="text"
              placeholder="输入标签后按回车添加"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  setTags([...tags, e.currentTarget.value]);
                  e.currentTarget.value = "";
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
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
    </>
  );
}
