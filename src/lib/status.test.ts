import { describe, it, expect } from "vitest";
import { classifyHlsError, statusMeta, type HlsErrorInfo, type HlsVerdict } from "./status";

const net = (p: { code?: number; details?: string; fatal?: boolean }): HlsErrorInfo => ({
  fatal: p.fatal ?? true,
  type: "networkError",
  details: p.details ?? "manifestLoadError",
  code: p.code,
});

// Narrows the union to a full verdict (throws on null / media-recover).
const v = (e: HlsErrorInfo, restricted: boolean, viaProxy: boolean): HlsVerdict => {
  const c = classifyHlsError(e, restricted, viaProxy);
  if (!c || c.recoverMedia) throw new Error("expected a verdict");
  return c;
};

describe("classifyHlsError", () => {
  it("returns null for non-fatal errors", () => {
    expect(classifyHlsError({ fatal: false, type: "networkError", details: "x" }, false, false)).toBeNull();
  });

  it("requests media recovery for media errors", () => {
    const c = classifyHlsError({ fatal: true, type: "mediaError", details: "bufferStalledError" }, false, false);
    expect(c).toEqual({ recoverMedia: true });
  });

  it("maps 403/451 to geo", () => {
    expect(v(net({ code: 403 }), false, false).status).toBe("geo");
    expect(v(net({ code: 451 }), false, false).status).toBe("geo");
  });

  it("maps 404/410/500/503 to offline", () => {
    for (const code of [404, 410, 500, 503]) {
      expect(v(net({ code }), false, false).status).toBe("offline");
    }
  });

  it("maps manifest/level load timeouts to offline", () => {
    expect(v(net({ details: "manifestLoadTimeOut" }), false, false).status).toBe("offline");
    expect(v(net({ details: "levelLoadTimeOut" }), false, false).status).toBe("offline");
  });

  it("maps a missing/zero code to cors", () => {
    expect(v(net({ code: undefined }), false, false).status).toBe("cors");
    expect(v(net({ code: 0 }), false, false).status).toBe("cors");
  });

  it("falls back to fail for other network codes", () => {
    expect(v(net({ code: 418 }), false, false).status).toBe("fail");
  });

  it("upgrades cors/fail to restricted when the stream needs headers", () => {
    const cors = v(net({ code: 0 }), true, false);
    expect(cors.status).toBe("restricted");
    expect(cors.bannerClass).toBe("restrict");
    expect(v(net({ code: 418 }), true, false).status).toBe("restricted");
  });

  it("is retriable for non-proxy attempts except on 404/410", () => {
    expect(v(net({ code: 0 }), false, false).retriable).toBe(true);
    expect(v(net({ code: 404 }), false, false).retriable).toBe(false);
    expect(v(net({ code: 410 }), false, false).retriable).toBe(false);
    expect(v(net({ code: 0 }), false, true).retriable).toBe(false);
  });

  it("prefixes the reason when already going through the proxy", () => {
    expect(v(net({ code: 403 }), false, true).reason).toMatch(/^Even via the proxy:/);
  });

  it("provides a human-readable head per status", () => {
    expect(v(net({ code: 403 }), false, false).head).toBe("Geo-blocked.");
    expect(v(net({ code: 0 }), false, false).head).toBe("Blocked by CORS.");
    expect(v(net({ code: 404 }), false, false).head).toBe("Source offline.");
    expect(v(net({ code: 0 }), true, false).head).toBe("Header-restricted.");
    expect(v(net({ code: 418 }), false, false).head).toBe("Couldn't play.");
  });
});

describe("statusMeta", () => {
  const plain = { restricted: false, geo: false, label: null };

  it("prioritises proxied and ok statuses", () => {
    expect(statusMeta(plain, "proxied").label).toBe("Proxied");
    expect(statusMeta(plain, "ok").label).toBe("OK");
  });

  it("shows restricted/geo from record flags over runtime status", () => {
    expect(statusMeta({ ...plain, restricted: true }, null).label).toBe("Restricted");
    expect(statusMeta({ ...plain, geo: true }, null).label).toBe("Geo");
  });

  it("reflects cors/fail/offline runtime statuses", () => {
    expect(statusMeta(plain, "cors").label).toBe("CORS");
    expect(statusMeta(plain, "fail").label).toBe("Fail");
    expect(statusMeta(plain, "offline").label).toBe("Offline");
  });

  it("shows a Note for a label with no other signal, else nothing", () => {
    expect(statusMeta({ ...plain, label: "Not 24/7" }, null).label).toBe("Note");
    expect(statusMeta(plain, null).label).toBe("");
  });
});
