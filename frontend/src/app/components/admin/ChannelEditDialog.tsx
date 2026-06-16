import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChannelEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: {
    id: string;
    name: string;
    description: string;
  } | null;
  onSave: (data: { name: string; description: string }) => Promise<void> | void;
}

export function ChannelEditDialog({ open, onOpenChange, channel, onSave }: ChannelEditDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description);
    } else {
      setName("");
      setDescription("");
    }
  }, [channel, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("请输入频道名称");
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      onOpenChange(false);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6 z-50" aria-describedby={undefined}>
          <div className="flex items-start justify-between mb-4">
            <Dialog.Title className="text-lg font-medium">
              {channel ? "编辑频道" : "新建频道"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-accent rounded">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">频道名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：模型动态、行业资讯"
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述这个频道的内容范围..."
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Dialog.Close asChild>
                <button className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent">
                  取消
                </button>
              </Dialog.Close>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
