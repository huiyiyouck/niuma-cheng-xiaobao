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


class SubChannelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
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
