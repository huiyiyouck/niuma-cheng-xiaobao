import { useState } from "react";
import { useSearchParams } from "react-router";
import { SpacesManagement } from "../components/admin/SpacesManagement";
import { SourceLibrary } from "../components/admin/SourceLibrary";
import { cn } from "../lib/utils";

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "spaces";

  const setActiveTab = (tab: string) => {
    if (tab === "spaces") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h1 className="mb-4">管理</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("spaces")}
              className={cn(
                "px-4 py-2 rounded-md transition-colors",
                activeTab === "spaces"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              空间管理
            </button>
            <button
              onClick={() => setActiveTab("source-library")}
              className={cn(
                "px-4 py-2 rounded-md transition-colors",
                activeTab === "source-library"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              信息源库
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "spaces" ? <SpacesManagement /> : <SourceLibrary />}
      </div>
    </div>
  );
}
