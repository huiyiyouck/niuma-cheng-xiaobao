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
  fullContent?: string;
  originalUrl?: string;
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
    fullContent: `OpenAI 今日宣布推出 GPT-5 的早期预览版本，据称在推理能力和多模态理解方面取得重大突破。根据官方发布的基准测试结果，GPT-5 在多项标准评测上均超越了前代模型。

新模型在代码生成、数学推理和长文本理解等任务上表现尤为突出。OpenAI CEO Sam Altman 表示，GPT-5 是该公司迄今为止最强大的模型，并将于未来几周内向 ChatGPT Plus 用户开放访问权限。

值得注意的是，此次发布伴随着新的安全评估框架，OpenAI 表示已在训练过程中进行了更严格的对齐优化。业内专家对此次发布反应不一，部分研究人员认为这标志着 AI 能力的重大飞跃，但也有人对模型的实际使用场景持谨慎态度。`,
    originalUrl: "https://techcrunch.com",
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
    fullContent: `美联储在今天的会议上决定维持基准利率在当前水平，符合市场预期。鲍威尔在新闻发布会上表示，委员会需要更多证据来确认通胀正在持续向 2% 目标靠拢。

此次决定是在通胀数据出现小幅回落背景下作出的。市场此前已基本预判到这一结果，因此股市和债市的反应相对平淡。标普 500 指数收盘微涨 0.3%，10 年期美债收益率基本持平。

鲍威尔在被问及降息时间表时保持谨慎，表示决策将完全依赖数据。多数分析师预计，美联储最早可能在下半年启动降息周期，但具体时机仍存在较大不确定性。`,
    originalUrl: "https://bloomberg.com",
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
    fullContent: `前 Google Brain 研究员张三宣布加入初创公司 XYZ AI，担任首席科学家一职。该公司专注于具身智能和机器人领域的研究，已完成 A 轮融资，估值达 2 亿美元。

张三在 Google Brain 期间发表了多篇关于强化学习和神经网络架构的重要论文，在学术界颇具影响力。此次加入 XYZ AI，被业内解读为具身智能赛道加速升温的信号。

XYZ AI 表示，将在未来一年内大规模扩充研究团队，并计划推出首款商业化产品。此前，已有多位顶级 AI 研究人员选择离开大型科技公司，转而加入专注于特定垂直领域的初创企业。`,
  },
  {
    id: 4,
    title: "GitHub Copilot 新功能支持整个代码库上下文理解",
    score: 7.9,
    source: { id: "3", name: "The Verge", removed: false },
    channel: "开源项目",
    time: "3小时前",
    summary:
      "GitHub 宣布 Copilot 将支持对整个代码仓库的深度理解，开发者可以就跨文件的复杂问题直接提问...",
    tags: ["开发工具", "AI编程"],
    entities: ["GitHub", "Copilot", "Microsoft"],
    fullContent: `GitHub 宣布 Copilot 将支持对整个代码仓库的深度理解，开发者可以就跨文件的复杂问题直接提问并获得精准回答。这一功能被称为"Workspace"模式，目前处于有限预览阶段。

在演示中，开发者可以询问类似"这个 bug 可能在哪些文件中被引入"或"帮我重构这个模块"等问题，Copilot 能够结合整个代码库的上下文给出有针对性的建议。

GitHub CEO Thomas Dohmke 表示，这代表着 AI 辅助编程从"代码补全"向"真正的编程伙伴"迈出了重要一步。目前该功能对 Copilot Enterprise 用户开放，预计将于年底前向所有付费用户推广。`,
    originalUrl: "https://theverge.com",
  },
  {
    id: 5,
    title: "字节跳动旗下 Coze 平台月活突破 500 万",
    score: 7.1,
    source: { id: "4", name: "36氪", removed: false },
    channel: "行业资讯",
    time: "6小时前",
    summary:
      "字节跳动旗下 AI 应用开发平台 Coze 宣布月活跃用户数突破 500 万，在 AI Agent 构建领域跻身头部...",
    tags: ["AI平台", "国内动态"],
    entities: ["字节跳动", "Coze"],
    fullContent: `字节跳动旗下 AI 应用开发平台 Coze 宣布月活跃用户数突破 500 万，在 AI Agent 构建领域跻身头部平台行列。该平台允许用户无需编程即可快速搭建个性化 AI 助手和自动化工作流。

自去年推出以来，Coze 已积累超过 100 万个已发布的 Bot，覆盖客服、内容创作、数据分析等多个场景。其与飞书、抖音等字节系产品的深度集成，被认为是其快速增长的重要原因之一。

面对 Dify、FastGPT 等国内竞争对手，以及 Zapier、Make 等海外平台，Coze 凭借字节的流量和生态优势保持领先。分析人士预计，AI Agent 平台市场在未来两年内将迎来更激烈的竞争。`,
    originalUrl: "https://36kr.com",
  },
];
