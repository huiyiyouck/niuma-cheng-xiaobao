import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import AfterValidator, BaseModel, Field
from typing_extensions import Annotated


def _not_blank(v: str) -> str:
    if not v.strip():
        raise ValueError("name 不可为空字符串或纯空格")
    return v


NonBlankStr = Annotated[str, AfterValidator(_not_blank)]


class SourceType(str, Enum):
    x_twitter = "x_twitter"
    rss = "rss"
    github_trending = "github_trending"
    hf_daily_papers = "hf_daily_papers"
    hacker_news = "hacker_news"
    semantic_scholar = "semantic_scholar"
    unknown = "unknown"


# ── ChannelSpace ──────────────────────────────

class ChannelSpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None


class ChannelSpaceOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime


# ── Source (v0.2 重构版) ──────────────────────

class SourceCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=200)
    source_url: Optional[str] = None
    type: Optional[str] = None
    config: dict = Field(default_factory=dict)


class SourceUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    source_url: Optional[str] = None
    type: Optional[str] = None
    config: Optional[dict] = None


class SourceOut(BaseModel):
    id: uuid.UUID
    type: str
    display_name: str
    source_url: Optional[str] = None
    status: str
    config: dict
    last_verified_at: Optional[datetime] = None
    verify_error: Optional[str] = None
    created_at: datetime


class SourceBindingInfo(BaseModel):
    channel_space_id: uuid.UUID
    channel_space_name: str
    sub_channel_id: Optional[uuid.UUID] = None
    sub_channel_name: Optional[str] = None
    enabled: bool


class SourceWithBindings(SourceOut):
    channel_spaces: list[SourceBindingInfo] = []


# ── Source 验证 ───────────────────────────────

class VerifyItem(BaseModel):
    source_item_id: str
    source_item_url: Optional[str] = None
    title: Optional[str] = None
    content_preview: Optional[str] = None
    published_at: Optional[str] = None


class SourceVerifyResponse(BaseModel):
    status: str
    items: list[VerifyItem] = []
    total_fetched: int = 0
    error: Optional[str] = None


# ── ChannelSource (保持兼容) ──────────────────

class ChannelSourceBind(BaseModel):
    source_id: uuid.UUID
    enabled: bool = True
    fetch_policy: dict = Field(default_factory=dict)
    sub_channel_id: Optional[uuid.UUID] = None


class ChannelSourceOut(BaseModel):
    id: uuid.UUID
    channel_space_id: uuid.UUID
    source_id: uuid.UUID
    enabled: bool
    fetch_policy: dict
    sub_channel_id: Optional[uuid.UUID] = None
    created_at: datetime


class ChannelSourceWithSource(BaseModel):
    channel_source: ChannelSourceOut
    source: SourceOut


class ChannelSourceUpdatePolicy(BaseModel):
    enabled: Optional[bool] = None
    fetch_policy: Optional[dict] = None
    sub_channel_id: Optional[uuid.UUID] = None


# ── News ──────────────────────────────────────

class ProcessedNewsOut(BaseModel):
    id: uuid.UUID
    channel_space_id: uuid.UUID
    raw_item_id: uuid.UUID
    sub_channel_id: Optional[uuid.UUID] = None
    title: str
    summary: str
    language: str
    source_refs: dict
    published_at: Optional[datetime]
    bullets: list[str]
    tags: list[str]
    entities: list[dict]
    importance_score: float
    created_at: datetime


# ── Stats ─────────────────────────────────────

class ChannelStats(BaseModel):
    total_news: int
    today_new: int
    active_sources: int
    sub_channel_count: int


# ── SubChannel ────────────────────────────────

class SubChannelCreate(BaseModel):
    name: NonBlankStr = Field(min_length=1, max_length=100)
    sort_order: int = Field(default=0, ge=0)


class SubChannelUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    sort_order: Optional[int] = Field(default=None, ge=0)


class SubChannelOut(BaseModel):
    id: uuid.UUID
    channel_space_id: uuid.UUID
    name: str
    sort_order: int
    created_at: datetime


# ── Admin Logs ────────────────────────────────

class LogEntry(BaseModel):
    timestamp: str
    level: str
    logger: str
    message: str
    extra: Optional[dict] = None


class LogQueryResponse(BaseModel):
    entries: list[LogEntry]
    total: int
    has_more: bool


# ── Alert ─────────────────────────────────────

class AlertOut(BaseModel):
    id: uuid.UUID
    channel_space_id: uuid.UUID
    type: str
    severity: str
    message: str
    meta: dict
    created_at: datetime


# ── WebSocket ─────────────────────────────────

class WSClientMessage(BaseModel):
    type: str
    channel_space_id: Optional[uuid.UUID] = None
