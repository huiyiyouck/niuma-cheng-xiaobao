# 非迭代任务：zero_new 告警降级为 info 提示

- 日期：2026-07-26
- 模式：非迭代小改（Owner 直接决策，Developer 执行）
- 角色：Developer

## 背景与决策

Owner 反馈：监控里「信息源 X 在 24h 内无新内容」（`zero_new`）告警优先级过高。并非每个信息源每天都必然有新闻产出，24h 无新内容不代表源异常，应降为提示而非告警。

## 改动

- `server/src/worker/monitor.ts` `zeroNewMonitorTick`：`createAlert` 显式传 `severity="info"`（原走默认 `warning`，前端映射为「中」黄色；`info` 前端映射「低」蓝色提示）。commit `fd69479`。
- 存量数据：测试库执行 `UPDATE alerts SET severity='info' WHERE type='zero_new' AND severity <> 'info'`，降级 164 条。

## 验证

- `server` tsc 0 错误
- 测试环境已部署（`deploy.sh test`，`news-api-test` active / health 200）
- 浏览器实测：监控页 zero_new 告警全部显示为「低」蓝色 info 样式

## 遗留（交 DevOps 生产部署时执行）

- 生产库存量降级 SQL（幂等）：

```sql
UPDATE alerts SET severity='info' WHERE type='zero_new' AND severity <> 'info';
```

- 代码随下一次生产部署（v0.6.1 R4 复核通过后的 DevOps 部署）一并上线，无需单独发布。
