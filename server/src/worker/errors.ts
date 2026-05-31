/** Worker 异常类型——等价 Python worker/errors.py */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}
