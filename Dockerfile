FROM python:3.12-slim

WORKDIR /app

# 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 应用代码
COPY app/ ./app/
COPY worker/ ./worker/

# 健康检查端点由 API 进程提供
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8000/v1/channel-spaces || exit 1

# 默认启动 API；Worker 通过 docker-compose command 覆盖
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
