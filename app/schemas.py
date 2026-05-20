import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChannelSpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None


class ChannelSpaceOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime


class SourceCreate(BaseModel):
    type: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    config: dict = Field(default_factory=dict)


class SourceOut(BaseModel):
    id: uuid.UUID
    type: str
    name: str
    config: dict
    created_at: datetime


class ChannelSourceBind(BaseModel):
    source_id: uuid.UUID
    enabled: bool = True
    fetch_policy: dict = Field(default_factory=dict)


class ChannelSourceOut(BaseModel):
    id: uuid.UUID
    channel_space_id: uuid.UUID
    source_id: uuid.UUID
    enabled: bool
    fetch_policy: dict
    created_at: datetime


class ChannelSourceWithSource(BaseModel):
    channel_source: ChannelSourceOut
    source: SourceOut


class ChannelSourceUpdatePolicy(BaseModel):
    enabled: Optional[bool] = None
    fetch_policy: Optional[dict] = None


class ProcessedNewsOut(BaseModel):
    id: uuid.UUID
    channel_space_id: uuid.UUID
    raw_item_id: uuid.UUID
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


class AlertOut(BaseModel):
    id: uuid.UUID
    channel_space_id: uuid.UUID
    type: str
    severity: str
    message: str
    meta: dict
    created_at: datetime


class WSClientMessage(BaseModel):
    type: str
    channel_space_id: Optional[uuid.UUID] = None
