/** 安全将值转为 object：null→{}, string→json解析, object→原样返回 */
export function asDict(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return {};
  if (typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return {};
}
