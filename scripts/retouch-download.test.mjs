import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";
import JSZip from "jszip";

// Use the existing TypeScript dependency to run the real API/ZIP modules on Node 20+.
// Absolute imports keep the same token store, refresh logic and JSZip instance throughout.
const require = createRequire(import.meta.url);
const external = (name) => pathToFileURL(require.resolve(name)).href;
async function moduleUrl(path, imports = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: fileURLToPath(new URL(`../${path}`, import.meta.url)),
  });
  for (const [from, to] of Object.entries(imports)) outputText = outputText.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const base = await moduleUrl("src/lib/api/baseUrl.ts");
const tokens = await moduleUrl("src/lib/auth/tokenStore.ts");
const auth = await moduleUrl("src/lib/auth/authStore.ts", { react: external("react") });
const refresh = await moduleUrl("src/lib/auth/refreshTokens.ts", {
  "@/lib/api/baseUrl": base, "@/lib/auth/tokenStore": tokens, "@/lib/auth/authStore": auth,
});
const client = await moduleUrl("src/lib/api/client.ts", {
  "@/lib/api/baseUrl": base, "@/lib/auth/tokenStore": tokens, "@/lib/auth/refreshTokens": refresh,
});
const { api, apiBlob, ApiError } = await import(client);
const { downloadRetouchPdf } = await import(await moduleUrl("src/lib/api/retouch.ts", { "@/lib/api/client": client }));
const { buildRetouchZip, RetouchZipError } = await import(await moduleUrl(
  "src/app/(studio)/studio/gallery/[galleryId]/_shell/retouchDownload.ts", { jszip: external("jszip") },
));
const { setTokens, clearTokens, getAccessToken, getRefreshToken } = await import(tokens);
const { getAuthState } = await import(auth);
const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; clearTokens(); });
const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 255, 0, 128]);
const pdf = new Blob([pdfBytes], { type: "application/pdf" });
const jpeg = new Uint8Array([255, 216, 255, 217]);
const expired = () => Response.json({ code: "AUTH_401_1", message: "만료" }, { status: 401 });
function item(photoId, originalFileName = `${photoId}.jpg`, viewUrl = `https://images.example.test/${photoId}.jpg`) {
  return { photo: { photoId, originalFileName, viewUrl }, requestText: null, points: [], hasResult: false };
}

test("PDF preserves bytes and sends the gallery, round, scope, token and cancellation signal", async () => {
  setTokens({ accessToken: "fixture-access", refreshToken: "fixture-refresh" });
  const controller = new AbortController();
  for (const scope of ["all", "memo", "noResult"]) {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), `https://api.example.test/api/v1/galleries/55/retouch/rounds/2/requests.pdf?scope=${scope}`);
      assert.equal(init.headers.Authorization, "Bearer fixture-access");
      assert.equal(init.headers.Accept, "application/pdf");
      assert.equal(init.signal, controller.signal);
      return new Response(pdfBytes, { headers: { "Content-Type": "application/pdf" } });
    };
    const result = await downloadRetouchPdf(55, 2, scope, controller.signal);
    assert.equal(result.type, "application/pdf");
    assert.deepEqual(new Uint8Array(await result.arrayBuffer()), pdfBytes);
  }
});

test("expired PDF refreshes once and retries with the new token", async () => {
  setTokens({ accessToken: "fixture-expired", refreshToken: "fixture-refresh" });
  const calls = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    if (String(input).endsWith("/auth/reissue")) return Response.json({ accessToken: "fixture-new", refreshToken: "fixture-rotated" });
    if (init.headers.Authorization === "Bearer fixture-expired") return expired();
    assert.equal(init.headers.Authorization, "Bearer fixture-new");
    return new Response(pdfBytes);
  };
  assert.deepEqual(new Uint8Array(await (await downloadRetouchPdf(55, 1)).arrayBuffer()), pdfBytes);
  assert.equal(calls.length, 3);
  assert.equal(getRefreshToken(), "fixture-rotated");
});

test("a second expired response never triggers a refresh loop", async () => {
  setTokens({ accessToken: "fixture-expired", refreshToken: "fixture-refresh" });
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls++;
    return String(input).endsWith("/auth/reissue") ? Response.json({ accessToken: "fixture-new", refreshToken: "fixture-rotated" }) : expired();
  };
  await assert.rejects(downloadRetouchPdf(55, 1), (err) => err instanceof ApiError && err.code === "AUTH_401_1");
  assert.equal(calls, 3);
});

test("PDF permission, busy and timeout errors retain server messages without refresh", async () => {
  for (const [status, code] of [[403, "GALLERY_403_1"], [429, "RETOUCH_429_1"], [503, "PDF_GENERATION_TIMEOUT"]]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ code, message: "서버 안내" }, { status }); };
    await assert.rejects(downloadRetouchPdf(55, 1), (err) => err instanceof ApiError && err.code === code && err.message === "서버 안내");
    assert.equal(calls, 1);
  }
});

test("HTML intermediary errors retain the HTTP status", async () => {
  globalThis.fetch = async () => new Response("<html>Gateway error</html>", { status: 502 });
  await assert.rejects(apiBlob("/fixture"), (err) => err instanceof ApiError && err.status === 502 && err.code === "UNKNOWN");
});

test("empty or HTML success bodies cannot be saved as a request PDF", async () => {
  for (const body of ["", "<html>Sign in</html>"]) {
    globalThis.fetch = async () => new Response(body);
    await assert.rejects(downloadRetouchPdf(55, 1), /PDF/);
  }
});

test("existing JSON, empty responses and public JSON POST behavior stays intact", async () => {
  setTokens({ accessToken: "fixture-access", refreshToken: "fixture-refresh" });
  globalThis.fetch = async (_input, init) => {
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.equal(init.body, '{"photoId":7}');
    return Response.json({ galleryId: 55 });
  };
  assert.deepEqual(await api("/fixture", { method: "POST", body: { photoId: 7 }, auth: false }), { galleryId: 55 });
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await api("/fixture"), undefined);
});

test("JSON requests still refresh using the shared authentication path", async () => {
  setTokens({ accessToken: "fixture-expired", refreshToken: "fixture-refresh" });
  globalThis.fetch = async (input, init) => String(input).endsWith("/auth/reissue")
    ? Response.json({ accessToken: "fixture-new", refreshToken: "fixture-rotated" })
    : init.headers.Authorization === "Bearer fixture-expired" ? expired() : Response.json({ ok: true });
  assert.deepEqual(await api("/fixture"), { ok: true });
});

test("pre-cancelled PDF makes no network request", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async () => { assert.fail("cancelled request dispatched"); };
  await assert.rejects(downloadRetouchPdf(55, 1, "all", controller.signal), { name: "AbortError" });
});

test("cancel during token refresh prevents the PDF retry", async () => {
  setTokens({ accessToken: "fixture-expired", refreshToken: "fixture-refresh" });
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls++;
    if (String(input).endsWith("/auth/reissue")) {
      controller.abort();
      return Response.json({ accessToken: "fixture-new", refreshToken: "fixture-rotated" });
    }
    return expired();
  };
  await assert.rejects(downloadRetouchPdf(55, 1, "all", controller.signal), { name: "AbortError" });
  assert.equal(calls, 2);
});

test("dead refresh keeps the existing logout behavior", async () => {
  setTokens({ accessToken: "fixture-expired", refreshToken: "fixture-refresh" });
  globalThis.fetch = async (input) => String(input).endsWith("/auth/reissue") ? new Response(null, { status: 401 }) : expired();
  await assert.rejects(downloadRetouchPdf(55, 1), (err) => err instanceof ApiError && err.status === 401);
  assert.equal(getAccessToken(), null);
  assert.equal(getRefreshToken(), null);
  assert.equal(getAuthState().status, "guest");
});

test("ZIP preserves the PDF and exact scoped photo bytes with safe unique filenames", async () => {
  const calls = [];
  const controller = new AbortController();
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    assert.equal(init.cache, "no-store");
    assert.equal(init.signal, controller.signal);
    return new Response(jpeg);
  };
  const progress = [];
  const result = await buildRetouchZip([item(1, "../신랑.png"), item(2, "신랑.JPG"), item(3, "신랑_2_1.jpg")], pdf, (done) => progress.push(done), controller.signal);
  const zip = await JSZip.loadAsync(await result.arrayBuffer());
  assert.deepEqual(Object.values(zip.files).filter((entry) => !entry.dir).map((entry) => entry.name).sort(),
    ["photos/신랑.jpg", "photos/신랑_2_1.jpg", "photos/신랑_2_1_3_1.jpg", "요청서.pdf"]);
  assert.deepEqual(await zip.file("요청서.pdf").async("uint8array"), pdfBytes);
  for (const name of Object.keys(zip.files).filter((name) => name.endsWith(".jpg"))) assert.deepEqual(await zip.file(name).async("uint8array"), jpeg);
  assert.deepEqual(progress, [1, 2, 3]);
  assert.deepEqual(calls, [1, 2, 3].map((id) => `https://images.example.test/${id}.jpg`));
});

test("failed photo prevents returning an incomplete ZIP", async () => {
  globalThis.fetch = async (input) => String(input).endsWith("2.jpg") ? new Response(null, { status: 403 }) : new Response(jpeg);
  await assert.rejects(buildRetouchZip([item(1, "A.jpg"), item(2, "B.jpg")], pdf, () => {}),
    (err) => err instanceof RetouchZipError && err.message.includes("1장의 사진") && err.message.includes("B.jpg"));
});

test("missing photo URL, network error or empty photo all prevent ZIP saving", async () => {
  globalThis.fetch = async () => { assert.fail("missing URL fetched"); };
  await assert.rejects(buildRetouchZip([item(1, "A.jpg", null)], pdf, () => {}), RetouchZipError);
  globalThis.fetch = async () => { throw new TypeError("network error"); };
  await assert.rejects(buildRetouchZip([item(1)], pdf, () => {}), RetouchZipError);
  globalThis.fetch = async () => new Response("");
  await assert.rejects(buildRetouchZip([item(1)], pdf, () => {}), RetouchZipError);
});

test("pre-cancelled ZIP makes no photo request", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async () => { assert.fail("cancelled ZIP fetched a photo"); };
  await assert.rejects(buildRetouchZip([item(1)], pdf, () => {}, controller.signal), { name: "AbortError" });
});

test("cancel during photo fetch stops the remaining photos", async () => {
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => { calls++; controller.abort(); throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(buildRetouchZip([item(1), item(2)], pdf, () => {}, controller.signal), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("cancel after the last photo prevents ZIP generation", async () => {
  const controller = new AbortController();
  globalThis.fetch = async () => new Response(jpeg);
  await assert.rejects(buildRetouchZip([item(1)], pdf, () => controller.abort(), controller.signal), { name: "AbortError" });
});

test("cancel while JSZip writes entries rejects instead of returning an archive", async () => {
  const controller = new AbortController();
  const generate = JSZip.prototype.generateAsync;
  let updates = 0;
  JSZip.prototype.generateAsync = function (options, onUpdate) {
    return generate.call(this, options, (metadata) => {
      updates++;
      controller.abort();
      onUpdate?.(metadata);
    });
  };
  globalThis.fetch = async () => new Response(jpeg);
  try {
    await assert.rejects(buildRetouchZip([item(1)], pdf, () => {}, controller.signal), { name: "AbortError" });
    assert(updates > 0);
  } finally {
    JSZip.prototype.generateAsync = generate;
  }
});
