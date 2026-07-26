/**
 * #A-R3-1：l1_error 公开接口归一化（纯函数测试，不依赖数据库）
 * 公开请求不得透出内部异常原文（endpoint/主机名/堆栈片段），只返回错误分类文案
 */
import { describe, it, expect } from "vitest";
import { publicL1Error } from "../api/routes/news.ts";

describe("publicL1Error 错误分类归一化", () => {
  it("空值返回 null", () => {
    expect(publicL1Error(null)).toBeNull();
    expect(publicL1Error(undefined)).toBeNull();
    expect(publicL1Error("")).toBeNull();
  });

  it("超时类归一为「AI 解析超时」", () => {
    expect(publicL1Error("connect ETIMEDOUT 10.0.0.8:8100 internal-llm-host")).toBe("AI 解析超时");
    expect(publicL1Error("Request timed out after 240000ms")).toBe("AI 解析超时");
    expect(publicL1Error("The operation was aborted")).toBe("AI 解析超时");
  });

  it("输出格式类归一为「AI 输出格式异常」", () => {
    expect(publicL1Error("Unexpected token in JSON at position 42")).toBe("AI 输出格式异常");
    expect(publicL1Error("zod schema validation failed: score missing")).toBe("AI 输出格式异常");
  });

  it("网络/服务类归一为「AI 服务暂时不可用」", () => {
    expect(publicL1Error("fetch failed")).toBe("AI 服务暂时不可用");
    expect(publicL1Error("ECONNREFUSED 127.0.0.1:8100")).toBe("AI 服务暂时不可用");
    expect(publicL1Error("HTTP 502 Bad Gateway from upstream")).toBe("AI 服务暂时不可用");
  });

  it("其他异常兜底为「AI 解析失败」", () => {
    expect(publicL1Error("something totally unexpected")).toBe("AI 解析失败");
  });

  it("归一化结果不包含原文内部信息", () => {
    const raw = "connect ETIMEDOUT 10.0.0.8:8100 internal-llm-host /v1/runs/news-l1";
    const out = publicL1Error(raw)!;
    expect(out).not.toContain("10.0.0.8");
    expect(out).not.toContain("internal-llm-host");
    expect(out).not.toContain("/v1/runs");
  });
});
