import json


def as_dict(v):
    """安全将值转为 dict：None→{}, str→json解析, dict→原样返回。"""
    if v is None:
        return {}
    if isinstance(v, dict):
        return v
    if isinstance(v, str):
        try:
            return json.loads(v)
        except Exception:
            return {}
    return {}
