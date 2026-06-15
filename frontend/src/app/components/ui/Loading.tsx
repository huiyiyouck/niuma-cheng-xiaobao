import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * 全局统一「加载中」组件：垂直居中 + 旋转图标 + 文字。
 * 默认占位一块区域（py-16）；传 className 可调整高度/留白。
 */
export function Loading({ text = "加载中…", className }: { text?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground", className)}>
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
