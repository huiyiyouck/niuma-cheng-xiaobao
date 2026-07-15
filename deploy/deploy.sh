#!/usr/bin/env bash
# niuma-cheng-xiaobao 全隔离打包部署脚本
#
# 架构（2026-06-28 去软链接化 + 前后端全隔离起）：
#   构建源（本仓库 /root/Project/niuma-cheng-xiaobao）只负责 git pull + build，
#   产物 rsync 分发到与开发/构建目录隔离的运行环境，build 不再污染任何线上环境。
#
#   前端 frontend/dist ──rsync──▶ /var/www/{news,test}.huiyiyou.cloud（nginx root，真实目录非软链）
#   后端 server/       ──rsync──▶ /srv/niuma-news/{prod,test}/server（systemd WorkingDirectory）
#
# 各运行目录的 server/.env 不在分发范围（rsync 显式排除），由部署机本地维护：
#   prod: /srv/niuma-news/prod/server/.env  → news 库，PORT 默认 8000，不设 ENABLE_AI_PROCESSING=true
#   test: /srv/niuma-news/test/server/.env  → news_test 库，PORT 8001
#
# 数据库迁移不在本脚本内：生产/测试库 schema 当初由 db:push 建立、drizzle 迁移元数据已脱轨，
#   两个后端 unit 均不带 ExecStartPre migrate。schema 变更走人工评估
#   （见 docs/knowledge/devops/db-migration-handbook.md 与 full-stack-deploy-handbook.md）。
#
# 用法: ./deploy.sh [test|prod|both]    默认 both
set -euo pipefail

SRC=/root/Project/niuma-cheng-xiaobao

build() {
  echo "==== 构建源同步 + 打包 ===="
  cd "$SRC"
  git fetch origin
  git pull --rebase
  git log --oneline -1
  ( cd frontend && npm install --no-audit --no-fund && npm run build )
  ( cd server   && npm install --no-audit --no-fund )
}

deploy_one() { # name www run svc port
  local name=$1 www=$2 run=$3 svc=$4 port=$5
  echo "==== 部署 $name ===="
  rsync -a --delete "$SRC/frontend/dist/" "$www/"
  rsync -a --delete --exclude='.env' --exclude='.env.*' --exclude='.git' "$SRC/server/" "$run/server/"

  # v0.6.1: 数据库迁移检查（#DO-2 修复）
  # 迁移脚本有 IF NOT EXISTS 保护，幂等执行安全
  # node -e 需在 server/ 目录下执行以找到 pg 模块
  local migrate_sql="$run/server/db/scripts/v0.6.1_ddl_only.sql"
  if [ -f "$migrate_sql" ]; then
    echo "  检查数据库迁移..."
    # 加载 .env 中的 DATABASE_URL
    set -a; source "$run/server/.env" 2>/dev/null || true; set +a
    # 检查 process_type 列是否已存在
    local col_exists
    col_exists=$(cd "$run/server" && node -e "const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT 1 FROM information_schema.columns WHERE table_name='raw_items' AND column_name='process_type'\").then(r=>{console.log(r.rows.length);p.end()}).catch(()=>{console.log(0);p.end()})" 2>/dev/null || echo 0)
    if [ "$col_exists" = "0" ]; then
      echo "  执行数据库迁移 v0.6.1..."
      cd "$run/server" && node -e "const{Pool}=require('pg');const fs=require('fs');const p=new Pool({connectionString:process.env.DATABASE_URL});const sql=fs.readFileSync('$migrate_sql','utf-8');p.query(sql).then(()=>{console.log('  迁移完成');p.end()}).catch(e=>{console.error('  迁移失败:',e.message);p.end();process.exit(1)})"
    else
      echo "  迁移已执行，跳过"
    fi
  fi

  systemctl restart "$svc"
  sleep 6
  printf "  %s: %s\n" "$svc" "$(systemctl is-active "$svc")"
  printf "  health(:%s): %s\n" "$port" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:$port/health)"
}

target=${1:-both}
build
case "$target" in
  test) deploy_one test /var/www/test.huiyiyou.cloud /srv/niuma-news/test news-api-test 8001 ;;
  prod) deploy_one prod /var/www/news.huiyiyou.cloud /srv/niuma-news/prod news-api 8000 ;;
  both)
    deploy_one test /var/www/test.huiyiyou.cloud /srv/niuma-news/test news-api-test 8001
    deploy_one prod /var/www/news.huiyiyou.cloud /srv/niuma-news/prod news-api 8000 ;;
  *) echo "用法: $0 [test|prod|both]"; exit 1 ;;
esac
echo "==== 部署完成（前端 build 不污染线上：已去软链 + rsync 分发）===="
