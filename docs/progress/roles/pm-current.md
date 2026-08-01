# PM 工作日志(近期)

> 启动默认读本文件 + `pm-summary.md` + `pm-corrections.md`;历史见 `pm-archive.md`,按需搜索。

## 2026-08-01 — 当日收尾归档

- 本次角色:产品架构师(PM)
- 今日完成(均已逐项 commit 留痕):① Owner 拍板落档:生产 LLM 换 volcengine(转 DevOps,已执行完毕)② PM 悬案清零:#5 轮询补算拍板 + Q-1 needs_context 补列定案 + language 表述订正(契约 v1.9)+ v0.6-summary 空文件补写 ③ INDEX 重构为角色待办任务书 ④ DevOps 任务书三项完成核对 + 任务 2 认账(操作单两点被实机否掉,记 pm-corrections)
- 收尾动作:双仓工作区干净且与远端同步;pm-current 613 行超 300 行硬阈值,执行三层归档(v0.6 全程 + v0.6.1 前期条目挪 archive,summary 四段重写)
- 无未完成的悬挂工作;PM 名下待办:零
- 下一步入口:等 ai v0.2 联调窗口(触发 Developer 三项 + #5 实现)或 Owner 启动下一迭代规划

## 2026-08-01 — DevOps 任务书三项完成核对：全清 + 任务 2 认账（PM 操作单两点被实机否掉）

- 本次角色：产品架构师(PM)
- 触发：Owner 通知运维已全部处理，要求重新扫描核对
- 核对结果（三项全完成）：
  1. **任务 1 生产 LLM 换 volcengine ✅**：`.env` 对齐 test（备份未重启）、红线守住（AI 仍关）；验证方式合理变通——红线下 worker 不 claim 致原验法不可行，改直连 volcengine 200 + deepseek-v4-flash 应答（等效）；顺带对齐 OPENAI_MODEL 遗留
  2. **任务 2 #16 ✅（安全解）**：DevOps 否掉任务书两点操作并给实机依据——「切 database」= 误开 prod AI（PM 独立核 `config.ts:96` 确认切即开，任务书红线自相矛盾）；「指 8102」= 跨环境泄漏（8102 系 test 专用实例）。安全解：保持 http + `AI_HUB_BASE_URL=` 显空 fail-fast + 注释路标。**database 对齐转「ai v0.2 上生产里程碑」整包**（prod ai worker + 有效 provider + 切换同批）。**PM 认账**：任务书越位写 how 且未核代码，记 pm-corrections（新规则：任务书只写 what+红线+验收）
  3. **任务 3 6i② ✅**：补 2 条 `["AI"]` source 冒烟条目 + 重跑 seed，8 queued / 3 条非空 domain_tags，双路径覆盖；coordination `b4a0178` 已销账（DevOps 会话自提交，无需代提）
- 文档动作：INDEX 任务书三项标结 + 任务 2 认账标注 + 下一步入口更新（DevOps 清零，唯余 Developer 三项 + Owner 迭代规划）；pm-corrections 新增 1 条
- xiaobao 侧在途全景（核对后）：Developer 三项（needs_context 列迁移 / #5 轮询补算 / #7，绑 ai v0.2 联调）+ Owner 下一迭代规划；DevOps/PM/Architect 名下清零
- 下一步：等 ai v0.2 联调窗口或 Owner 启动迭代规划

## 2026-08-01 — PM 悬案清零：#5 轮询补算拍板 + Q-1 补列定案 + language 订正（契约 v1.9）+ v0.6-summary 补写

- 本次角色：产品架构师(PM)
- 触发：Owner 指令三连——#5 拍掉、Q-1/language 能拍就拍、v0.6-summary 补上
- 拍板与产出：
  1. **#5 score_total database 补算 → 轮询方案**：挂 worker tick，条件 `completed AND dims IS NOT NULL AND score_total IS NULL`，公式复用 `calcScoreTotal` 应用层单一真源（不选触发器：避免公式双真源——max_attempts/1800s 两次漂移教训）；实现随 ai v0.2 联调（Developer，与 #7 同批），决策前置已清
  2. **Q-1 needs_context → 补列**：ai 已产出的质量信号不丢弃（与 sentiment 不同——无需新增能力），`processed_news.needs_context boolean`；Architect 早已表态架构侧无异议成本极低；ai v0.2 按 v1.9 写入；xiaobao 列迁移登记 Developer 待办（ai 写回联调前落地）；前端消费留后续迭代
  3. **language 表述 → 认账订正**：我 07-25 帖「原文语种归 raw_items.language」系笔误（该列不存在），原文语种当前不落任何列；契约行补全（占位 xiaobao 写 'zh'，ai 保持）
  4. **v0.6-summary.md 补写完成**（空文件旧账清账）：依据 v0.6.md 与 INDEX 留痕补齐——交付三主线 / 五方 Review 最大规模实战 / 关闭条件 A~D 及现状回看 / 状态回写失守事件 / Git 节点；标注补写说明不新增当时未记录的结论
- 契约动作：news-l1-db v1.8 → **v1.9**（三项拍板落档）+ CHANGELOG 记行 + 沟通文档回帖（Q-1 定案 = C-3 欠答项闭合）
- 涉及文档：coordination 契约/CHANGELOG/沟通文档；xiaobao v0.6-summary.md（新建）/ v0.6.1-summary.md #5 行 / INDEX / 本日志
- 下一步：PM 名下悬案清零。余 xiaobao 在途：DevOps（生产 LLM 换 volcengine 已拍待执行 + #16 + 6i②）/ Developer（needs_context 列迁移 + #5 实现 + #7,绑 ai v0.2 联调）

## 2026-07-28 — REQ-003 ai 三件事：PM 答日增量（几十条/天，v0.3 无需前移）+ 两件转办

- 本次角色：产品架构师(PM)
- 触发：Owner 通知 ai 侧补充沟通文档待回复；ai 提三件事按角色分派（C-14→Architect / 测试队列不可领→DevOps / 日增量→PM）
- PM 名下（日增量量级）回应：
  - 事实：生产 total_ai 757 条 ≈ X Stream 上线以来 50+ 天累积 → 活跃期日均 15~30 条；当前断流 today_new=0
  - 增长因子逐项：账号扩容不改数量级 / rss+jin10 近期不接（Q-6 已定）/ 无灰度放量计划 / 无上千场景
  - 结论：**「几十条/天」量级，对 ai v0.2 能力（340~920/天）有 5~10 倍余量，v0.3 并发化无需前移**；承诺量级跃迁时提前经沟通文档知会
- C-14 产品面口径（补给 Architect，不代答架构半）：真实 L0 领域分类当前不在 v0.6.x 规划内（与 sentiment 同属后续候选）；ai 排除集适配设计 PM 认可
- 转办登记（INDEX）：测试队列不可领 → DevOps（最高，ai 唯一被卡动作；PM 倾向补建 5 条 + 修脚本双管齐下，顺带部署 744d20a）；C-14 → Architect
- ai 侧「第四次文档与实现不符」批评：成立，接受；对应知识库条目已在（契约字段级对照），C-14 答复将按逐处核查执行
- 涉及文档：coordination 沟通文档（回帖 + 待跟进 8/9/10 行）；xiaobao INDEX / 本日志
- 下一步：Owner 开 DevOps 会话（最急）+ Architect 会话（C-14 连同 Q-1/language 一并）

## 2026-07-27 — v0.6.1 迭代关闭检查 + 收尾归档：有条件关闭

- 本次角色：产品架构师(PM)
- 触发：Owner 问「这期迭代是否完整跑完、可否收尾」
- 关闭检查（9 项）：
  1. 阶段状态一致 ⚠️→已订正（迭代记录概览/INDEX 版本列表两处过期留痕）
  2. 各阶段结论齐备 ✅：PRD R2 定稿 / 设计 R2 定稿 / 实现 R1→R4（R4 复核 PM✅+Architect✅）/ Developer 自测 61/61 / 部署检查（测试+生产 R4，Architect 三项核实全过）/ **Owner 验收 ✅通过（2026-07-27 当场确认，已落归档节真源）**
  3. 阻塞项 ✅：迭代级无；7 项对 ai 承诺待办经 Owner 确认挂遗留清单（每项带归属+触发时机）
  4-6. INDEX 已更新 / 无关键阻塞 / Change Note 为零 ✅
  7. summary 已产出 + 知识库沉淀 2 条 ✅
  8. 后端能力废弃（ENABLE_AI_PROCESSING）前端零引用 ✅（R3 核查有据）
  9. 元信息无变更，跳过台账 ✅
- PM 独立证据：生产 API 实测 health 200 / ai_* 三字段 / 列表含 process_type/l1_status/l1_error 归一化
- Owner 两项拍板：验收通过；遗留处置经解释「每项去处与时机」后按挂遗留关闭执行
- 产出：
  - `iterations/v0.6.1-summary.md`（新建：交付/流程教训/已知限制 3 项/遗留 7 项带时机/Git 节点）
  - `iterations/v0.6.1.md`（归档节填写 + 概览关闭态）
  - `INDEX.md`（当前迭代→无 / 版本列表 v0.6.1 ✅已完成 + summary 链接 / 收尾摘要行 / 近期待办非迭代通道化）
  - `docs/knowledge/`：新增 2 条（enumerate-all-write-paths-on-pipeline-change / contract-drafting-field-level-verification）+ INDEX 索引
- 旧账提示：v0.6-summary.md 至今空文件（2026-07-25 已发现，本次再次登记），建议 Owner 安排补写
- 下一步入口：Owner 拍板——清 #1（DevOps）/#2 批（Developer 非迭代 Bugfix）或启动下一迭代（候选输入：sentiment / 相关性深化 / ai v0.2 联调配合）

## 2026-07-27 — REQ-003 契约缺项分派回应：PM 4 项答毕（C-10 定案不引入 sentiment，契约 v1.2）

- 本次角色：产品架构师(PM)
- 触发：Owner 通知 ai 侧在沟通文档留言待澄清；ai 侧 2026-07-26 转达契约缺项 C-1~C-10（4 条阻塞其 PRD 定稿）并按角色分派，PM 名下 4 项（含 1 阻塞）
- 跨仓红线检查：coordination `git pull --rebase` Already up to date，工作区干净
- PM 4 项回应：
  1. **C-10 产品半（阻塞）→ 定案不引入 `sentiment`**：代码核查前后端 sentiment 零消费；HTTP 契约 v1 L133 真源即 `processing`。定性为 PM 起草 DB 契约笔误（与 O-1 同类，认账）。tags_v2 回归 `{domain,entity,event,content_type,processing}`，契约订正 v1.1→v1.2 + CHANGELOG 记行。sentiment 登记后续迭代候选（届时先改 HTTP 契约）。**C-10 整条闭合**（Architect 半随之消解），ai 阻塞余 C-2/C-3/C-5 三条
  2. **C-7 → `language` 固定 `'zh'`**（news-l1 输出契约即中文输出，产出语种非原文语种）；id 生成留 Architect 随 C-3 答
  3. **Q-2 → 知悉并接受** context 恒空（前端条件渲染零副作用；承诺写入迭代关闭已知限制，不当质量问题回流）
  4. **Q-6 → 近期不接入** rss/jin10_flash 到 AI 链路；同意 ai 验收分层；将来接入时提报新联调
- Architect 转办：C-2/C-3/C-5（阻塞）+ C-4/C-1/Q-1/Q-3/Q-4/Q-5/C-8/C-9 已登记 xiaobao INDEX 待办
- 涉及文档：coordination `contracts/news-l1-db.md`（v1.2）/ `CHANGELOG.md` / `communications/REQ-003-db-boundary-async.md`（回帖 + 待跟进表 6b/6e）；xiaobao `INDEX.md` / 本日志
- 下一步：Owner 开 Architect 会话清 C-2/C-3/C-5（ai 侧提示其中两条只需查代码照实补文档）；DevOps 生产部署照旧

## 2026-07-26 — v0.6.1 实现 R4 PM 复核：通过（含 #PM-R3-1 误报公开撤回）

- 本次角色：产品架构师(PM)
- 触发：Owner 通知 R4 修复完成（commit `5ab883f`），要求 PM 复核；Architect 已先行复核 ✅（新增 2中3低不阻塞）
- 动作：
  1. 逐项 diff 核查同批修复 6 项（news.ts / level-status.ts / NewsPage / MonitoringPage / api.ts / 新增单测）
  2. **#PM-R3-1 用 `git show 0c733c5:api.ts` 对历史版本定案：PM 误报**——R3 版本注释本为 AD-05 四维，从不存在错误 key；根因是 R3 会话被污染的工具输出被残留引用。公开撤回，教训记入 `pm-corrections.md`（新规则：污染轮次派生事实全部作废，Review 意见须逐条干净取证）
  3. 复跑验证：单测 news-public-error 6/6 ✅、server tsc 0 错误 ✅
  4. 测试环境（Owner 已要求 Developer 部署 R4）实测：`/global-level-status-counts` 返回 ai_* 三字段 ✅、详情返回 content 原文 + original_url ✅、无 token 请求 l1_error 归一化 ✅
  5. 可视化验收（借 REQ-003 R-4 造数的真实队列）：侧栏「AI 待处理 5」、财经空间 5 条「待解析」卡片（角标/无评分/无 AI 标签）、抽屉（L0 通过状态条 + 正文 + 查看原文 + 全页无失败字样）——R3 时缺数据未验的 pending 基础展示态本轮实测闭环
- 复核结论：✅ 通过。R4 复核 2/2 方（PM/Architect），实现阶段收口
- 涉及文档：`v0.6.1.md`（PM R4 复核章节 + R4 门禁行 + 概览）/ `INDEX.md` / `pm-corrections.md`（新增 1 条）/ 本日志
- 下一步：DevOps 生产部署（部署前核实 Architect #A-R4-1 缓存头 / #A-R4-2 ADMIN_REQUIRE_BOTH）→ PM 重新执行迭代关闭检查（遗留记：ai worker 未上线致富展示端到端未验）
- **留痕订正（2026-07-27）**：PM R4 复核章节与 R4 门禁行 PM 结论实际随 commit `d7e41d8`（message 为 Architect 复核）入库——并行 Architect 会话提交时将 PM 工作区未提交修改一并扫入，commit 归属与内容不符；`b6c149b` 为 PM 复核配套提交（INDEX/日志/纠错）。内容双方均无异议，不改写历史，仅此说明。流程风险已报 Owner：同机多会话并行操作同一 git 工作区时，`git add` 范围须限定本会话触碰的文件。

## 2026-07-25 — REQ-003 ai 侧承接回应：O-1 定案方案 A + 契约订正 v1.1 + R-5 交付 + R-1~R-4 转办

- 本次角色：产品架构师(PM)
- 触发：Owner 告知 ai 侧已承接 REQ-003 并有待 xiaobao 回应项，要求查看共同文档（coordination）
- 跨仓红线检查：coordination 位置 `../niuma-cheng-coordination`（remote 匹配），`git pull --rebase` Already up to date，工作区干净
- ai 侧提出：O-1（P0，`score_total` 归属与三处真源冲突，阻塞 ai PRD 定稿）/ O-5（P2 枚举重复）/ R-1~R-5 就绪度确认
- PM 回应：
  1. **O-1 定案方案 A**（`score_total` 归 xiaobao）：代码事实核查 `l1-processor.ts:171` `calcScoreTotal(score_dimensions)` 现即 xiaobao 加权写入；HTTP 契约/ai 业务边界/契约变更纪律第 5 条三处真源一致。属契约起草笔误非边界变更，PM 权限内定案（维持 Owner 既定边界），无需 Owner 新决策
  2. **契约订正 v1 → v1.1**：职责边界表 + processed_news 字段表 + 状态行 + O-5 枚举合并；CHANGELOG 记行（非 breaking）
  3. **R-5 全量交付**：x_twitter/rss/jin10_flash 三类 content 字段表 + 缺失兜底 + sources.config 按 type 字段 + renderForLLM 参照指引（均自写入路径代码提取）；真实样例指路 ai 凭 SELECT 自取或 DevOps 附送
  4. **R-1/R-2 事实引用**：迁移含角色+GRANT 已在测试/生产执行（迭代部署留痕），正式 verify 转 DevOps，PM 不代下 DevOps 结论
  5. **R-3/R-4 转办 DevOps/Owner**：R-4 PM 产品意见倾向造数脚本（选项①），反对临时放开 INSERT（选项③违背最小权限）
- 涉及文档：coordination `contracts/news-l1-db.md`（v1.1）/ `CHANGELOG.md` / `communications/REQ-003-db-boundary-async.md`（回应 + 待跟进表）/ `REQUESTS.md`（状态行 + 详细节）；xiaobao `INDEX.md`（转办待办）/ 本日志
- 下一步：ai 侧解除 P0 阻塞继续 v0.2 PRD Review；xiaobao DevOps 会话接 R-1~R-4 转办项回帖 coordination

## 2026-07-25 — v0.6.1 实现 R3 PM Review（前端展示层）：有条件通过

- 本次角色：产品架构师(PM)
- 触发：Owner 通知 Developer 已完成前端展示层实现（commit `0c733c5`），要求 PM Review；Owner 已订正流程为 PM/Architect/DevOps 三方 Review（此前 Developer 代写的「PM ✅」已作废，本次为首次真实 PM R3 Review）
- 动作：
  1. 代码核查 R3 全部 5 个文件（api.ts / NewsPage / MonitoringPage / AppSidebar / news.ts）对齐 PRD R2 §5.3-§5.11
  2. 可视化验收：发现测试环境跑旧构建（部署本就排在三方 Review 后，符合流程）；改用本地 dev server（Developer 遗留进程，代理测试后端真实数据）实测
  3. API 数据核查定性：测试环境 23 条新闻全部 completed 但 score_dimensions/analysis/context 全空（v0.6 存量数据），四维/分析区块无法端到端可视验证，属数据侧空缺非前端缺陷
  4. 独立发现 #PM-R3-1：api.ts 四维评分 TS 类型 key 与 AD-05 不符（importance/relevance/credibility 应为 impact/confidence/clarity），运行时不受影响（NewsPage 用 Object.entries + 正确映射），低严重度
  5. 阅读 Architect R3 全部 9 条意见，对提请 PM 的 4 项作出裁定
  6. 追加 PM R3 Review 章节入迭代记录 + 更新 R3 门禁行/概览/INDEX/PM 日志
- 裁定结果：
  - #A-R3-2：采纳方案①，retryable_failed 归入「解析中」（用户无需感知重试机制，避免误导性「失败」）
  - #A-R3-4：手动重试按钮延期至 ai worker 上线后迭代（生产尚无失败态，无使用场景）
  - #A-R3-5：正文/外链纳入同批修复（改动量小，趁 #A-R3-1 必修同批）
  - #A-R3-8：保留直显类来源标签（§5.3「不展示标签」指 AI 语义标签，口径由 PM 收口）
- 结论：⚠️ 有条件通过。三方 R3 Review 收齐（DevOps ✅ / Architect ⚠️ / PM ⚠️），R3 不定稿，进入 Developer R4 修复轮（同批 6 项，#A-R3-1 部署前必修）
- 验证证据：
  - 本地 dev（localhost:5173 → test 后端）：侧栏「AI 待处理/AI 处理中」✅ / 抽屉状态条「✓ L0 通过 → ✓ AI 解析完成」✅ / 监控「AI 处理概览」六卡 + 口径说明 ✅
  - `curl /v1/news?space_id=…`：23 条 l1_status=completed、process_type=ai，四维字段 0 条有值
  - `curl /v1/global-level-status-counts`：completed 154 = total_ai 154（Architect #A-R3-3 指出的口径巧合，PM 确认属实）
- 本次为 Review 文档追加，未修改任何产出正文（P0 红线遵守）
- 下一步：Developer R4 修复 → PM/Architect 复核 → DevOps 部署 → PM 重新执行迭代关闭检查

## 2026-07-25 — v0.6.1 迭代关闭检查：不可关闭（前端展示层未实现）

- 本次角色：产品架构师(PM)
- 触发：Owner 要求查看 v0.6.1 迭代状态并确认是否收尾
- 动作：
  1. 执行迭代关闭检查 9 项门禁
  2. 第 8 项后端能力废弃核查：前端零引用 `ENABLE_AI_PROCESSING/AI_INTEGRATION_MODE/l0_classify/l1_ai_process/process_type` ✅
  3. 第 2 项核查发现高严重度缺口：PRD R2 §5.10「前端三层展示」在 `NewsPage.tsx` 完全未实现，`api.ts` 缺 `l1_status/process_type/score_dimensions/analysis/context` 字段类型
  4. 根因：实现阶段 PM/Architect/DevOps 三方 Review 意见全部集中后端，漏审前端展示层（PRD 定「UI 变更轻并入 PM 自审」，PM 自审未核查前端实现）
  5. 向 Owner 报告缺口 + 三个方向；Owner 决定：不关闭，登记前端待办备注，另开前端会话实现
  6. 登记缺口与前端待办清单入迭代记录 + 更新 INDEX 状态/下一步入口 + PM 日志
- 涉及文档：
  - `docs/progress/iterations/v0.6.1.md`（新增「实现阶段遗留：前端展示层未实现」节 + 概览当前阶段订正）
  - `docs/progress/INDEX.md`（当前阶段/阻塞项/下一步入口 + 版本列表状态 + 最近收尾摘要）
  - `docs/progress/roles/pm-current.md`
- 关闭检查结论：❌ **不可关闭**（1 项高严重度缺口未闭合）
- 代码事实核查证据：
  - `grep l1_status/process_type/score_dimensions/analysis/context frontend/src/app/lib/api.ts` → 零命中
  - `NewsPage.tsx` 卡片/抽屉仅展示单一 `score` + `summary` + `fullContent`，无状态徽章/四维评分/AI分析/直显·AI分层
  - 后端 `news.ts` 已返回 `l1_status/process_type`（实现 R1 #DD8），前端未接
- 本次为文档修改，未运行代码测试
- 附带发现（仅记录，未擅自修改）：
  - `docs/progress/iterations/v0.6-summary.md` 为空文件，但 INDEX 版本列表标 v0.6「已完成（有条件关闭）」并链接它 —— v0.6 收尾 summary 疑似未落盘，待 Owner 决定是否补
- 下一步：Developer（前端会话）按迭代记录待办清单实现前端展示层 → PM 对照 PRD R2 §5.10 验收 → 重新执行迭代关闭检查 → 收尾归档
