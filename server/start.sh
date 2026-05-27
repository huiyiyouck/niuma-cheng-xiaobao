#!/bin/bash
# 牛马程小报 v0.3 — Node.js 生产启动脚本
set -e

cd "$(dirname "$0")"

# 检查 .env
if [ ! -f .env ]; then
  echo "❌ 缺少 .env 文件，请从 .env.example 复制并配置"
  exit 1
fi

# 检查端口
if lsof -ti:8000 > /dev/null 2>&1; then
  echo "⚠️  端口 8000 已被占用，先停止..."
  kill $(lsof -ti:8000) 2>/dev/null
  sleep 1
fi

# 安装依赖（如未安装）
if [ ! -d node_modules ]; then
  echo "📦 安装依赖..."
  npm install
fi

# 启动服务
echo "🚀 启动牛马程小报..."
nohup npx tsx src/index.ts > /tmp/niuma-server.log 2>&1 &
PID=$!
echo "✅ API + Worker 已启动 (PID=$PID)"
echo "   日志: /tmp/niuma-server.log"
echo "   健康检查: curl http://127.0.0.1:8000/health"

# 等待就绪
sleep 3
if curl -sf http://127.0.0.1:8000/health > /dev/null; then
  echo "✅ 健康检查通过"
else
  echo "❌ 健康检查失败，请查看日志"
  tail -20 /tmp/niuma-server.log
  exit 1
fi
