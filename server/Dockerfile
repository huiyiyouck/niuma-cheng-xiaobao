FROM node:22-alpine

WORKDIR /app

# 系统依赖
RUN apk add --no-cache curl

# 依赖安装
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# 构建后的代码（由 CI/build script 预先 tsc 编译或直接用 tsx）
COPY server/dist/ ./dist/
COPY server/node_modules/ ./node_modules/
COPY frontend/dist/ ./frontend/dist/

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8000/health || exit 1

ENV PORT=8000
ENV HOST=0.0.0.0

EXPOSE 8000

CMD ["node", "dist/index.js"]
