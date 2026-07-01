import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, RefreshCw, Search, Send, ServerCrash } from "lucide-react";
import { listAiDebugCandidates, runAiDebugNewsL1 } from "../lib/api";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

type Candidate = {
  news_id: string;
  raw_item_id: string;
  title: string;
  summary: string;
  published_at?: string | null;
  score: number;
  source: { id: string; identity: string; name: string; type: string };
  l0_status: string;
  l1_status: string;
  raw_text_preview: string;
};

function fmtTime(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function prettyJson(value: unknown): string {
  return value == null ? "" : JSON.stringify(value, null, 2);
}

export function AiDebugPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [result, setResult] = useState<any>(null);
  const [requestPreview, setRequestPreview] = useState("");
  const [responsePreview, setResponsePreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [maxToolCalls, setMaxToolCalls] = useState(4);
  const [timeoutMs, setTimeoutMs] = useState(180000);

  async function loadCandidates(nextSearch = search) {
    setLoading(true);
    try {
      const rows = await listAiDebugCandidates({ search: nextSearch || undefined, page_size: 40 });
      setItems(rows ?? []);
      if (!selected && rows?.[0]) setSelected(rows[0]);
    } catch (err: any) {
      toast.error("候选新闻加载失败");
      setError(err?.detail || err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidates("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRun() {
    if (!selected) return;
    const triggerPayload = {
      news_id: selected.news_id,
      options: { max_tool_calls: maxToolCalls, timeout_ms: timeoutMs },
    };
    setRunning(true);
    setResult(null);
    setError(null);
    setRequestPreview(prettyJson({
      endpoint: "POST /v1/ai-debug/news-l1-runs",
      note: "后端会按真实业务映射把所选新闻构造成 AI news-l1 L1Input；AI 返回后这里会替换为实际 L1Input。",
      selected: {
        news_id: selected.news_id,
        raw_item_id: selected.raw_item_id,
        title: selected.title,
      },
      payload: triggerPayload,
    }));
    setResponsePreview("请求处理中，AI L1 处理通常需要 60-100 秒，请等待完整响应返回。");
    try {
      const resp = await runAiDebugNewsL1(triggerPayload);
      setResult(resp);
      setRequestPreview(prettyJson(resp?.input));
      setResponsePreview(prettyJson(resp?.response));
      toast.success("AI 联调返回成功");
    } catch (err: any) {
      const msg = err?.detail || err?.message || "AI 联调失败";
      setError(msg);
      setResponsePreview(prettyJson({
        status: "failed",
        error: msg,
      }));
      toast.error("AI 联调失败");
    } finally {
      setRunning(false);
    }
  }

  const output = result?.response?.output;
  const status = result?.response?.status;
  const toolSummary = result?.response?.tool_summary;

  const selectedInput = useMemo(() => requestPreview || prettyJson(result?.input), [requestPreview, result]);
  const selectedResponse = useMemo(() => responsePreview || prettyJson(result?.response), [responsePreview, result]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1>AI 联调</h1>
            <div className="mt-1 text-sm text-muted-foreground">news-l1 · xiaobao → ai</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadCandidates(); }}
                className="pl-9"
                placeholder="搜索标题、摘要、来源"
              />
            </div>
            <Button variant="outline" onClick={() => loadCandidates()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              刷新
            </Button>
          </div>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-[420px_1fr]">
        <aside className="min-h-0 border-r border-border flex flex-col">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">
                工具上限
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={maxToolCalls}
                  onChange={(e) => setMaxToolCalls(Number(e.target.value))}
                  className="mt-1"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                超时 ms
                <Input
                  type="number"
                  min={1000}
                  max={600000}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="mt-1"
                />
              </label>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {loading && items.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />加载中
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">无数据</div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <button
                    key={item.news_id}
                    onClick={() => {
                      setSelected(item);
                      setResult(null);
                      setRequestPreview("");
                      setResponsePreview("");
                      setError(null);
                    }}
                    className={cn(
                      "block w-full px-4 py-3 text-left hover:bg-accent/60 transition-colors",
                      selected?.news_id === item.news_id && "bg-accent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-medium">{item.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{item.source.name}</span>
                          <span>·</span>
                          <span className="shrink-0">{fmtTime(item.published_at)}</span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs tabular-nums">
                        {Number(item.score || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.raw_text_preview || item.summary}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-auto">
          <div className="mx-auto max-w-[1120px] px-6 py-5 space-y-5">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">当前选择</div>
                  <div className="mt-1 text-lg font-semibold">{selected?.title || "未选择"}</div>
                  {selected && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{selected.source.name}</span>
                      <span>raw_item_id: {selected.raw_item_id}</span>
                      <span>L1: {selected.l1_status}</span>
                    </div>
                  )}
                </div>
                <Button onClick={submitRun} disabled={!selected || running}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  发送 AI
                </Button>
              </div>
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <ServerCrash className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-all">{error}</span>
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">请求</span>
                  {running && <span className="text-xs text-muted-foreground">已发送，等待 AI 返回</span>}
                </div>
                <Textarea
                  className="min-h-[300px] font-mono text-xs"
                  readOnly
                  placeholder="点击发送 AI 后显示本次请求；AI 返回后显示实际 L1Input。"
                  value={selectedInput}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">响应</span>
                  {running && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <Textarea
                  className="min-h-[300px] font-mono text-xs"
                  readOnly
                  placeholder="等待 AI 返回后显示完整 RunResponse。"
                  value={selectedResponse}
                />
              </div>
            </div>

            {result && (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {status === "succeeded" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <ServerCrash className="h-4 w-4 text-destructive" />}
                    状态
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{status}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    耗时
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">{result.response?.elapsed_ms ?? 0} ms</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-sm text-muted-foreground">工具调用</div>
                  <div className="mt-2 text-sm tabular-nums">
                    web {toolSummary?.web_search ?? 0} · link {toolSummary?.link_read ?? 0} · kb {toolSummary?.kb_search ?? 0}
                  </div>
                </div>
              </div>
            )}

            {output && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">AI 输出</div>
                    <h2 className="mt-1 text-xl font-semibold">{output.title}</h2>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs">
                    {output.needs_context ? "needs_context" : "context_ok"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{output.summary}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {Object.entries(output.score_dimensions || {}).map(([key, dim]: any) => (
                    <div key={key} className="rounded-md bg-accent/50 p-3">
                      <div className="text-xs text-muted-foreground">{key}</div>
                      <div className="mt-1 text-lg font-semibold tabular-nums">{dim.score}</div>
                      <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{dim.reason}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(output.tags || {}).flatMap(([group, values]: any) =>
                    Array.isArray(values) ? values.map((v: string) => (
                      <span key={`${group}:${v}`} className="rounded-full border border-border px-2 py-1 text-xs">
                        {group}:{v}
                      </span>
                    )) : []
                  )}
                </div>
              </div>
            )}

          </div>
        </section>
      </div>
    </div>
  );
}
