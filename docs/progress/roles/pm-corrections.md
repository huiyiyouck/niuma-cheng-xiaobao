# 产品架构师(PM) 纠错记录

> 本角色发现错误后可追加。保持 30 条以内，超出时删除最旧条目。
> 每次 Agent 启动时读取本文件，避免重复犯错。

## 2026-05-31 — INDEX 是项目状态唯一真源，不能只看文档内状态字段

- **错误**：Review 测试报告时，只看了 `v0.4-test-report.md` 里的「Review 状态」表（写着 Developer 待 Review），就以为 Developer 还没 Review。实际上 INDEX 已反映 Developer ✅有条件通过 + 3 项收口事项待决。
- **根因**：启动后读了 INDEX，但后续工作时以单文档内的状态字段为准，没有以 INDEX 为最终真相。
- **纠错**：修正了 test-report.md / v0.4.md / INDEX 中我注入的过时信息；以 PM 视角对 3 项收口做了决定。
- **规则**：**项目级当前状态以 `docs/progress/INDEX.md` 为唯一真源**（runtime.md 已写明）。当文档内状态字段与 INDEX 矛盾时，以 INDEX 为准。启动后如果 INDEX 和文档状态不一致，应先修正文档再继续工作。
