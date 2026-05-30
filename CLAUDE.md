# Claude Code 模式入口

## 第一层：模式入口

默认先进入模式入口层，不自动进入一人公司开发团队模式。

如果用户只是问候、闲聊或没有说明任务，回复当前处于模式入口层：可以继续普通 Claude Code 模式，也可以通过固定触发语进入一人公司开发团队模式。此时不要读取 `docs/baseline/runtime.md`。

在入口层，按用户意图分流：

- 普通 Claude Code 模式：普通问答、闲聊、解释文件、临时改代码、临时运行命令，不读取团队基线、不要求角色、不写 `docs/progress/`。
- 一人公司开发团队模式：用户明确触发团队工作流后，才读取 `docs/baseline/runtime.md` 并按团队规则工作。

默认且必须使用中文与用户对话；代码标识符、命令、错误信息、第三方 API 名称和必要英文引用可以保留原文。

## 团队模式触发

用户出现以下意图时，进入一人公司开发团队模式：

- "进入团队模式""进入一人公司开发团队模式""使用团队工作流"
- "执行 Bootstrap 初始化流程"
- "你以什么角色运行""以什么角色运行""切换到某个团队角色"
- "以 PM（产品经理）角色工作""你是 Developer（开发工程师）""这次用 Tester（测试工程师）"
- "启动标准迭代""创建 PRD""进入 Review""执行收尾归档""执行迭代关闭检查""执行流程审计"
- 明确要求使用 PM、UI、Architect、Developer、Tester、DevOps、Role Creator 等团队角色

如果用户意图不明确，先按普通 Claude Code 模式响应；不要主动套团队流程。

## 普通 Claude Code 模式

普通模式下：

- 不读取 `docs/baseline/runtime.md`。
- 不要求用户选择角色。
- 不创建或更新 `docs/progress/`。
- 不执行 Bootstrap、收尾归档、迭代关闭检查或流程审计。
- 按用户当次请求正常完成任务。

用户之后说"进入团队模式"或指定团队角色时，再切换到团队模式。

## 团队模式启动

进入团队模式后：

1. 先执行 `git rev-parse --is-inside-work-tree` 判断当前目录是否为 Git 仓库。
2. 如果是 Git 仓库，执行 `git status --short`。如果工作区干净且 `git log @{u}..HEAD --oneline` 为空（无未推送 commit），再执行 `git pull --rebase`；否则只执行 `git fetch` 并提醒用户当前有未同步变更。最后执行 `git log --oneline -10`。
3. 如果不是 Git 仓库，不执行 `git status`、`git pull` 或 `git log`，只记录"当前目录不是 Git 仓库"。Bootstrap 时再询问用户是否初始化 Git。
4. 读取 `docs/baseline/runtime.md`。后续一切加载、路由、角色选择、初始化判断、工作模式分流和规则约束均由 `runtime.md` 决定。
