import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Alert, ChannelSpace, ChannelSource, ProcessedNews, Source, SubChannel
from app.schemas import (
    AlertOut,
    ChannelSpaceCreate,
    ChannelSpaceOut,
    ChannelSourceBind,
    ChannelSourceOut,
    ChannelSourceUpdatePolicy,
    ChannelSourceWithSource,
    ProcessedNewsOut,
    SourceCreate,
    SourceOut,
    SubChannelCreate,
    SubChannelUpdate,
    SubChannelOut,
)
from app.utils import as_dict as _as_dict


router = APIRouter()

def _source_out(r: Source) -> SourceOut:
    return SourceOut.model_validate({"id": r.id, "type": r.type, "name": r.name, "config": _as_dict(r.config), "created_at": r.created_at})


def _channel_source_out(r: ChannelSource) -> ChannelSourceOut:
    return ChannelSourceOut.model_validate(
        {
            "id": r.id,
            "channel_space_id": r.channel_space_id,
            "source_id": r.source_id,
            "enabled": r.enabled,
            "fetch_policy": _as_dict(r.fetch_policy),
            "sub_channel_id": r.sub_channel_id,
            "created_at": r.created_at,
        }
    )


def _processed_news_out(r: ProcessedNews) -> ProcessedNewsOut:
    return ProcessedNewsOut.model_validate(
        {
            "id": r.id,
            "channel_space_id": r.channel_space_id,
            "raw_item_id": r.raw_item_id,
            "sub_channel_id": r.sub_channel_id,
            "title": r.title,
            "summary": r.summary,
            "language": r.language,
            "source_refs": _as_dict(r.source_refs),
            "published_at": r.published_at,
            "bullets": r.bullets or [],
            "tags": r.tags or [],
            "entities": r.entities or [],
            "importance_score": float(r.importance_score or 0),
            "created_at": r.created_at,
        }
    )


def _alert_out(r: Alert) -> AlertOut:
    return AlertOut.model_validate(
        {
            "id": r.id,
            "channel_space_id": r.channel_space_id,
            "type": r.type,
            "severity": r.severity,
            "message": r.message,
            "meta": _as_dict(r.meta),
            "created_at": r.created_at,
        }
    )


@router.get("/channel-spaces", response_model=list[ChannelSpaceOut])
async def list_channel_spaces(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(ChannelSpace).order_by(ChannelSpace.created_at.desc()))).scalars().all()
    return [ChannelSpaceOut.model_validate(r, from_attributes=True) for r in rows]


@router.post("/channel-spaces", response_model=ChannelSpaceOut)
async def create_channel_space(payload: ChannelSpaceCreate, session: AsyncSession = Depends(get_session)):
    obj = ChannelSpace(name=payload.name, description=payload.description)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return ChannelSpaceOut.model_validate(obj, from_attributes=True)


@router.get("/sources", response_model=list[SourceOut])
async def list_sources(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(Source).order_by(Source.created_at.desc()))).scalars().all()
    return [_source_out(r) for r in rows]


@router.post("/sources", response_model=SourceOut)
async def create_source(payload: SourceCreate, session: AsyncSession = Depends(get_session)):
    obj = Source(type=payload.type, name=payload.name, config=payload.config)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return _source_out(obj)


@router.get("/channel-spaces/{channel_space_id}/sources", response_model=list[ChannelSourceWithSource])
async def list_channel_sources(channel_space_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    rows = (
        await session.execute(
            select(ChannelSource, Source)
            .join(Source, Source.id == ChannelSource.source_id)
            .where(ChannelSource.channel_space_id == channel_space_id)
            .order_by(ChannelSource.created_at.desc())
        )
    ).all()
    result: list[ChannelSourceWithSource] = []
    for cs, src in rows:
        result.append(
            ChannelSourceWithSource(
                channel_source=_channel_source_out(cs),
                source=_source_out(src),
            )
        )
    return result


@router.post("/channel-spaces/{channel_space_id}/sub-channels", response_model=SubChannelOut)
async def create_sub_channel(
    channel_space_id: uuid.UUID,
    payload: SubChannelCreate,
    session: AsyncSession = Depends(get_session),
):
    exists = (await session.execute(
        select(ChannelSpace.id).where(ChannelSpace.id == channel_space_id)
    )).scalar_one_or_none()
    if not exists:
        raise HTTPException(status_code=404, detail="channel_space not found")

    obj = SubChannel(
        channel_space_id=channel_space_id,
        name=payload.name,
        sort_order=payload.sort_order,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return SubChannelOut.model_validate(obj, from_attributes=True)


@router.get("/channel-spaces/{channel_space_id}/sub-channels", response_model=list[SubChannelOut])
async def list_sub_channels(
    channel_space_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    rows = (await session.execute(
        select(SubChannel)
        .where(SubChannel.channel_space_id == channel_space_id)
        .order_by(SubChannel.sort_order, SubChannel.created_at)
    )).scalars().all()
    return [SubChannelOut.model_validate(r, from_attributes=True) for r in rows]


@router.put("/sub-channels/{sub_channel_id}", response_model=SubChannelOut)
async def update_sub_channel(
    sub_channel_id: uuid.UUID,
    payload: SubChannelUpdate,
    session: AsyncSession = Depends(get_session),
):
    row = (await session.execute(
        select(SubChannel).where(SubChannel.id == sub_channel_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="sub_channel not found")

    values = {}
    if payload.name is not None:
        values["name"] = payload.name
    if payload.sort_order is not None:
        values["sort_order"] = payload.sort_order
    if not values:
        raise HTTPException(status_code=400, detail="at least one field required")
    await session.execute(
        update(SubChannel).where(SubChannel.id == sub_channel_id).values(**values)
    )
    await session.commit()
    row = (await session.execute(
        select(SubChannel).where(SubChannel.id == sub_channel_id)
    )).scalar_one()
    return SubChannelOut.model_validate(row, from_attributes=True)


@router.delete("/sub-channels/{sub_channel_id}", status_code=204)
async def delete_sub_channel(
    sub_channel_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    row = (await session.execute(
        select(SubChannel).where(SubChannel.id == sub_channel_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="sub_channel not found")
    await session.delete(row)
    await session.commit()


@router.post("/channel-spaces/{channel_space_id}/sources", response_model=ChannelSourceOut)
async def bind_source(channel_space_id: uuid.UUID, payload: ChannelSourceBind, session: AsyncSession = Depends(get_session)):
    exists = (await session.execute(select(ChannelSpace.id).where(ChannelSpace.id == channel_space_id))).scalar_one_or_none()
    if not exists:
        raise HTTPException(status_code=404, detail="channel_space not found")
    source_exists = (await session.execute(select(Source.id).where(Source.id == payload.source_id))).scalar_one_or_none()
    if not source_exists:
        raise HTTPException(status_code=404, detail="source not found")
    if payload.sub_channel_id:
        sc_exists = (await session.execute(
            select(SubChannel.id).where(
                SubChannel.id == payload.sub_channel_id,
                SubChannel.channel_space_id == channel_space_id,
            )
        )).scalar_one_or_none()
        if not sc_exists:
            raise HTTPException(status_code=400, detail="sub_channel not found in this channel_space")
    obj = ChannelSource(
        channel_space_id=channel_space_id,
        source_id=payload.source_id,
        enabled=payload.enabled,
        fetch_policy=payload.fetch_policy,
        sub_channel_id=payload.sub_channel_id,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return _channel_source_out(obj)


@router.put("/channel-sources/{channel_source_id}", response_model=ChannelSourceOut)
async def update_channel_source(
    channel_source_id: uuid.UUID, payload: ChannelSourceUpdatePolicy, session: AsyncSession = Depends(get_session)
):
    row = (await session.execute(select(ChannelSource).where(ChannelSource.id == channel_source_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="channel_source not found")
    values = {}
    if payload.enabled is not None:
        values["enabled"] = payload.enabled
    if payload.fetch_policy is not None:
        values["fetch_policy"] = payload.fetch_policy
    if payload.sub_channel_id is not None:
        cs_row = (await session.execute(
            select(ChannelSource.channel_space_id).where(ChannelSource.id == channel_source_id)
        )).scalar_one()
        sc_exists = (await session.execute(
            select(SubChannel.id).where(
                SubChannel.id == payload.sub_channel_id,
                SubChannel.channel_space_id == cs_row,
            )
        )).scalar_one_or_none()
        if not sc_exists:
            raise HTTPException(status_code=400, detail="sub_channel not found in this channel_space")
        values["sub_channel_id"] = payload.sub_channel_id
    if values:
        await session.execute(update(ChannelSource).where(ChannelSource.id == channel_source_id).values(**values))
        await session.commit()
    row = (await session.execute(select(ChannelSource).where(ChannelSource.id == channel_source_id))).scalar_one()
    return _channel_source_out(row)


@router.get("/channel-spaces/{channel_space_id}/news", response_model=list[ProcessedNewsOut])
async def list_news(
    channel_space_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sub_channel_id: Optional[uuid.UUID] = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(ProcessedNews)
        .where(ProcessedNews.channel_space_id == channel_space_id)
        .order_by(ProcessedNews.published_at.desc().nullslast(), ProcessedNews.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if sub_channel_id is not None:
        stmt = stmt.where(ProcessedNews.sub_channel_id == sub_channel_id)
    rows = (await session.execute(stmt)).scalars().all()
    return [_processed_news_out(r) for r in rows]


@router.get("/news/{news_id}", response_model=ProcessedNewsOut)
async def get_news(news_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    row = (await session.execute(select(ProcessedNews).where(ProcessedNews.id == news_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="news not found")
    return _processed_news_out(row)


@router.get("/alerts", response_model=list[AlertOut])
async def list_alerts(
    channel_space_id: Optional[uuid.UUID] = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Alert).order_by(Alert.created_at.desc()).limit(limit)
    if channel_space_id:
        stmt = stmt.where(Alert.channel_space_id == channel_space_id)
    rows = (await session.execute(stmt)).scalars().all()
    return [_alert_out(r) for r in rows]
