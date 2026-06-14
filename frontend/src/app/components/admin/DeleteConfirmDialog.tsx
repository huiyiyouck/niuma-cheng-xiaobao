import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";

interface DeleteSpaceData {
  type: "space";
  name: string;
  channelCount: number;
  placementCount: number;
  newsCount: number;
}

interface DeleteChannelData {
  type: "channel";
  name: string;
  spaceName: string;
  placementCount: number;
  sourceCount: number;
  newsCount: number;
  hasConflicts: boolean;
}

interface DeleteSourceData {
  type: "source";
  name: string;
  placementCount: number;
  newsCount: number;
}

interface RemovePlacementData {
  type: "remove-placement";
  sourceName: string;
  location: string;
  isLastPlacement: boolean;
}

type DeleteData = DeleteSpaceData | DeleteChannelData | DeleteSourceData | RemovePlacementData;

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DeleteData;
  onConfirm: (migrateToRoot?: boolean) => void;
}

export function DeleteConfirmDialog({ open, onOpenChange, data, onConfirm }: DeleteConfirmDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [migrateOption, setMigrateOption] = useState<"migrate" | "remove">("migrate");

  if (!data) return null;

  const isNameMatch = confirmName === data.name;

  const handleConfirm = () => {
    if (!isNameMatch) return;

    if (data.type === "channel") {
      onConfirm(migrateOption === "migrate");
    } else {
      onConfirm();
    }

    // Reset state
    setConfirmName("");
    setMigrateOption("migrate");
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6 z-50" aria-describedby={undefined}>
          <div className="flex items-start justify-between mb-4">
            <Dialog.Title className="text-lg font-medium">
              {data.type === "remove-placement"
                ? "从展示位置移除"
                : `确认删除${data.type === "space" ? "空间" : data.type === "channel" ? "频道" : "信息源"}`
              }
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-accent rounded">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {/* Warning */}
            {data.type !== "remove-placement" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>此操作不可撤销</strong>
                </div>
              </div>
            )}

            {/* Impact Preview */}
            <div className="bg-muted/50 rounded-md p-4 space-y-2">
              {data.type === "remove-placement" ? (
                <>
                  <div className="text-sm">
                    <span className="text-muted-foreground">信息源：</span>
                    <span className="font-medium ml-2">{data.sourceName}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">移除位置：</span>
                    <span className="font-medium ml-2">{data.location}</span>
                  </div>
                  {data.isLastPlacement && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mt-2">
                      <div className="text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        这是该信息源的最后一个展示位置，移除后该信息源将变为未使用状态
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-medium mb-2">影响预览</div>
                  {data.type === "space" ? (
                <>
                  <div className="text-sm">
                    <span className="text-muted-foreground">频道数：</span>
                    <span className="font-medium ml-2">{data.channelCount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">信息源展示位置数：</span>
                    <span className="font-medium ml-2">{data.placementCount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">历史新闻数：</span>
                    <span className="font-medium ml-2">{data.newsCount}</span>
                    <span className="text-muted-foreground ml-2">（将被保留）</span>
                  </div>
                </>
              ) : data.type === "channel" ? (
                <>
                  <div className="text-sm">
                    <span className="text-muted-foreground">展示位置数：</span>
                    <span className="font-medium ml-2">{data.placementCount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">涉及信息源：</span>
                    <span className="font-medium ml-2">{data.sourceCount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">历史新闻数：</span>
                    <span className="font-medium ml-2">{data.newsCount}</span>
                    <span className="text-muted-foreground ml-2">（将被保留）</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm">
                    <span className="text-muted-foreground">展示位置数：</span>
                    <span className="font-medium ml-2">{data.placementCount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">历史新闻数：</span>
                    <span className="font-medium ml-2">{data.newsCount}</span>
                    <span className="text-muted-foreground ml-2">（将被保留）</span>
                  </div>
                </>
              )}
                </>
              )}
            </div>

            {/* Channel-specific options */}
            {data.type === "channel" && (
              <div className="space-y-2">
                <div className="font-medium text-sm">展示位置处理方式</div>

                <label className="flex items-start gap-3 p-3 border border-border rounded-md hover:bg-accent/50 cursor-pointer">
                  <input
                    type="radio"
                    name="migrate"
                    value="migrate"
                    checked={migrateOption === "migrate"}
                    onChange={() => setMigrateOption("migrate")}
                    disabled={data.hasConflicts}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">迁移到空间根节点（{data.spaceName} / 全部）</div>
                    {data.hasConflicts && (
                      <div className="text-xs text-destructive mt-1">
                        根节点已存在相同信息源，无法迁移
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-border rounded-md hover:bg-accent/50 cursor-pointer">
                  <input
                    type="radio"
                    name="migrate"
                    value="remove"
                    checked={migrateOption === "remove"}
                    onChange={() => setMigrateOption("remove")}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">直接移除全部展示位置</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      信息源将从此频道完全移除
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Confirm Input */}
            {data.type === "remove-placement" ? (
              <div className="text-sm text-muted-foreground">
                确认要从此位置移除该信息源吗？
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  请输入{data.type === "space" ? "空间" : data.type === "channel" ? "频道" : "信息源"}名称"{data.type === "source" ? data.name : "name" in data ? data.name : ""}"以确认删除
                </label>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={data.type === "source" ? data.name : "name" in data ? data.name : ""}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (isNameMatch || data.type === "remove-placement")) {
                      handleConfirm();
                    }
                  }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Dialog.Close asChild>
                <button className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent">
                  取消
                </button>
              </Dialog.Close>
              <button
                onClick={handleConfirm}
                disabled={data.type !== "remove-placement" && !isNameMatch}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {data.type === "remove-placement" ? "确认移除" : "确认删除"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
