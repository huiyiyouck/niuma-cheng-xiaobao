// 前端先行阶段的 mock fixture 数据。
// 后端 v0.6 API 就绪后，按 v0.6-design.md §3.2 契约逐项替换为真实 fetch。
import { TrendingUp, FileText, Radio, FolderOpen } from "lucide-vue-next";
import type { FunctionalComponent } from "vue";

export interface NewsSource {
  id: string;
  name: string;
  removed: boolean;
}

export interface NewsItem {
  id: number;
  title: string;
  score: number;
  source: NewsSource;
  channel: string;
  time: string;
  summary: string;
  tags: string[];
  entities: string[];
}

export const newsStats: { label: string; value: string; icon: FunctionalComponent }[] = [
  { label: "今日新增", value: "142", icon: TrendingUp },
  { label: "总新闻", value: "8,432", icon: FileText },
  { label: "启用信息源", value: "38", icon: Radio },
  { label: "频道数", value: "12", icon: FolderOpen },
];

export const spaces = [
  { id: "all", name: "全部" },
  { id: "ai", name: "AI" },
  { id: "finance", name: "财经" },
  { id: "tech", name: "科技" },
];

export const channelsMap: Record<string, Array<{ id: string; name: string }>> = {
  all: [{ id: "all", name: "全部" }],
  ai: [
    { id: "all", name: "全部" },
    { id: "models", name: "模型动态" },
    { id: "industry", name: "行业资讯" },
    { id: "research", name: "研究进展" },
  ],
  finance: [
    { id: "all", name: "全部" },
    { id: "market", name: "市场动态" },
    { id: "policy", name: "政策解读" },
  ],
  tech: [
    { id: "all", name: "全部" },
    { id: "startup", name: "创业公司" },
    { id: "opensource", name: "开源项目" },
  ],
};

export const mockNews: NewsItem[] = [
  {
    id: 1,
    title: "OpenAI 发布 GPT-5 预览版，性能提升显著",
    score: 8.5,
    source: { id: "1", name: "TechCrunch", removed: false },
    channel: "模型动态",
    time: "2小时前",
    summary:
      "OpenAI 今日宣布推出 GPT-5 的早期预览版本，据称在推理能力和多模态理解方面取得重大突破...",
    tags: ["人工智能", "大语言模型"],
    entities: ["OpenAI", "GPT-5"],
  },
  {
    id: 2,
    title: "美联储维持利率不变，市场反应平淡",
    score: 7.2,
    source: { id: "2", name: "Bloomberg", removed: false },
    channel: "市场动态",
    time: "5小时前",
    summary:
      "美联储在今天的会议上决定维持基准利率在当前水平，符合市场预期。鲍威尔在新闻发布会上表示...",
    tags: ["金融", "货币政策"],
    entities: ["美联储", "鲍威尔"],
  },
  {
    id: 3,
    title: "某知名 AI 研究员加入新创公司担任首席科学家",
    score: 6.8,
    source: { id: "removed", name: "AI Weekly", removed: true },
    channel: "行业资讯",
    time: "1天前",
    summary:
      "前 Google Brain 研究员张三宣布加入初创公司 XYZ AI，担任首席科学家一职。该公司专注于...",
    tags: ["人才流动", "创业"],
    entities: ["Google Brain", "XYZ AI"],
  },
];
