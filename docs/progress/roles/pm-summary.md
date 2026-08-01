# PM 工作日志摘要

> 四段式(当前状态 / 长期事实 / 常见风险 / 下一步入口),≤120 行;过程细节见 current/archive。2026-08-01 重写。

## 当前状态

- 当前迭代:无。v0.6.1 已于 2026-07-27 有条件关闭(Owner 验收通过),summary 落档;v0.6 summary 亦已补写(2026-08-01)。
- 项目空闲,xiaobao 侧在途仅两摊:**Developer 三项**(needs_context 列迁移 / #5 score_total 轮询补算 / #7 重试接口,绑 ai v0.2 联调启动)+ **Owner 下一迭代规划**(候选:sentiment / 相关性深化 / ai v0.2 联调配合)。
- PM / Architect / DevOps 名下待办:零。任务清单真源:INDEX「角色待办任务书」。

## 长期事实(跨迭代稳定结论)

- **产品主线**:多源新闻聚合,direct(直显)/ai(AI 解析)双链路;四维评分(timeliness/impact/confidence/clarity,AD-05)加权 `score_total` 归 xiaobao(`calcScoreTotal`,(T×.25+I×.35+C×.25+X×.15)×2)。
- **跨项目格局**:AI 解析经 REQ-003 从 HTTP 同步改为数据库契约边界异步(契约 `news-l1-db`,当前 **v1.9**;HTTP 契约 v1.1 留作回滚路径)。schema 权属 xiaobao,ai 只经 `ai_worker` 角色列级权限读写。契约变更纪律:先改 coordination contracts → 两侧代码,CHANGELOG 记行。
- **关键产品口径(PM 拍定)**:sentiment 不引入(后续候选,先改 HTTP 契约再做);`processed_news.language` 恒 'zh'(产出语种);context 恒空可接受(ai 防编造过滤);retryable_failed 对用户显示「解析中」;直显类保留来源标识标签;needs_context 补列存储、前端消费留后续;rss/jin10_flash 近期不进 AI 链路。
- **量级口径**:AI 链路日增「几十条/天」,对 ai v0.2 单实例能力(340~920/天)有 5~10 倍余量,v0.3 并发化无需前移;量级跃迁时 PM 承诺提前经沟通文档知会。
- **「ai v0.2 上生产里程碑」整包**:prod 切 database + 部署 prod ai worker + 有效 LLM provider + 开 AI 链路 + 回滚端点落定——单切任何一项都是延迟地雷,届时 DevOps 一批执行。
- **已知限制(双侧留痕)**:富展示端到端未验(等 ai worker);生产 LLM 已换 volcengine 备料(AI 开关仍关)。

## 常见风险(PM 已犯过的,详见 pm-corrections)

- 项目状态以 INDEX 为唯一真源,文档内状态字段冲突时以 INDEX 为准。
- 污染的工具输出及其派生"事实"全部作废,Review 意见逐条干净取证(#PM-R3-1 误报教训)。
- 契约字段表禁止凭记忆写,逐行指向可核查真源(score_total/tags_v2 两次 P0 往返教训)。
- PM 任务书只写 what+红线+验收,不写操作步骤;执行角色实机否掉细节时默认执行角色对(#16 任务书两点被否教训)。

## 下一步入口

- **ai v0.2 联调启动时**:开 Developer 会话做三项(needs_context 列迁移须在 ai 写回前落地);#5 轮询补算方案已拍(worker tick + calcScoreTotal 单一真源),照办即可。
- **Owner 启动下一迭代**:候选输入已备(sentiment / 相关性深化 / 事件时间线机会池);PM 建议等富展示真实点亮后定主题。
- 跨项目在途查 coordination `communications/REQ-003-db-boundary-async.md` 待跟进表;xiaobao 侧无被催项。
