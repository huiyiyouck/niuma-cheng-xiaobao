class NonRetryableError(Exception):
    """不可重试的异常——Worker 捕获后直接标记 failed，不走重试队列。"""
