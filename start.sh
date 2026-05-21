#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_PORT=8000
FRONTEND_PORT=5173
PIDS=()

cleanup() {
    echo ""
    echo "正在停止所有服务..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null
    echo "已停止"
    exit 0
}
trap cleanup SIGINT SIGTERM

# 清理残留进程
lsof -ti:$API_PORT 2>/dev/null | xargs kill 2>/dev/null || true
lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill 2>/dev/null || true
sleep 1

echo "======================================"
echo "  程牛马小报 一键启动"
echo "======================================"

# 启动后端 API
echo "[1/2] 启动后端 API (端口 $API_PORT)..."
cd "$ROOT_DIR"
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port $API_PORT &
PIDS+=($!)

# 启动前端 dev server
echo "[2/2] 启动前端 (端口 $FRONTEND_PORT)..."
cd "$ROOT_DIR/frontend"
npm run dev -- --port $FRONTEND_PORT &
PIDS+=($!)

# 等待服务就绪
echo ""
echo "等待服务启动..."
for i in $(seq 1 30); do
    if curl -s "http://localhost:$API_PORT/v1/channel-spaces" >/dev/null 2>&1 && \
       curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo ""
echo "======================================"
echo "  服务已启动！"
echo "  前端: http://localhost:$FRONTEND_PORT"
echo "  API:  http://localhost:$API_PORT/docs"
echo "======================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

wait
