import json
import logging
import sys
from datetime import datetime, timezone
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from typing import Optional

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_FILE = LOG_DIR / "api.log"

_logger: Optional[logging.Logger] = None


class JsonFormatter(logging.Formatter):
    """JSON 行格式化器——与 Worker 完全一致。"""

    def format(self, record):
        entry = {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "extra_data"):
            entry["extra"] = record.extra_data
        return json.dumps(entry, ensure_ascii=False)


def get_logger(name: str = "api") -> logging.Logger:
    global _logger
    if _logger is not None:
        return _logger

    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # 文件输出：JSON 格式，按天轮转，保留 7 天
    json_fmt = JsonFormatter()
    fh = TimedRotatingFileHandler(
        str(LOG_FILE), when="D", interval=1, backupCount=7, encoding="utf-8"
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(json_fmt)

    # 控制台输出：可读格式，INFO 及以上
    console_fmt = logging.Formatter(
        "%(asctime)s [%(levelname)-5s] %(name)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    ch = logging.StreamHandler(sys.stderr)
    ch.setLevel(logging.INFO)
    ch.setFormatter(console_fmt)

    _logger = logging.getLogger(name)
    _logger.setLevel(logging.DEBUG)
    _logger.addHandler(fh)
    _logger.addHandler(ch)

    return _logger
