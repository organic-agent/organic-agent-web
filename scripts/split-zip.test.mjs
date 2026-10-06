import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Next.js의 타입스크립트 소스를 새 테스트 실행기 의존성 없이 직접 검증한다.
const source = readFileSync(new URL("../src/lib/upload/splitZipSelection.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { groupZipSelection, isZipUpload } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const file = (name) => new File([name], name, { lastModified: 1 });
const names = (selection) => selection.inputs[0].parts.map((part) => part.name);

test("numbered ZIP pieces sort numerically, including unpadded numbers beyond 9", () => {
  const result = groupZipSelection([10, 2, 9, 8, 7, 6, 5, 4, 3, 1].map((n) => file(`photos.zip.${n}`)));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(names(result), Array.from({ length: 10 }, (_, n) => `photos.zip.${n + 1}`));
});

test("volume ZIP pieces put the final ZIP after the numbered disks", () => {
  const result = groupZipSelection(["photos.zip", "photos.z02", "photos.z01"].map(file));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(names(result), ["photos.z01", "photos.z02", "photos.zip"]);
});

test("uppercase extensions and names still belong to the same group", () => {
  const result = groupZipSelection(["PHOTOS.ZIP", "photos.z01", "Photos.Z02"].map(file));
  assert.deepEqual(result.errors, []);
  assert.equal(result.inputs.length, 1);
  assert.equal(result.inputs[0].parts.length, 3);
});

for (const [format, first, third, missing] of [
  ["numbered", "photos.zip.001", "photos.zip.003", "photos.zip.002"],
  ["volumes", "photos.z01", "photos.z03", "photos.z02"],
]) {
  test(`${format} missing middle piece excludes the whole group and names the gap`, () => {
    const result = groupZipSelection([first, third, ...(format === "volumes" ? ["photos.zip"] : [])].map(file));
    assert.equal(result.inputs.length, 0);
    assert.match(result.errors[0], new RegExp(missing.replaceAll(".", "\\.")));
  });
  test(`${format} missing first piece is rejected`, () => {
    const result = groupZipSelection([third].map(file));
    assert.equal(result.inputs.length, 0);
    assert.match(result.errors[0], /파일이 빠졌어요/);
  });
  test(`${format} repeated piece numbers are rejected`, () => {
    const result = groupZipSelection([first, first, ...(format === "volumes" ? ["photos.zip"] : [])].map(file));
    assert.equal(result.inputs.length, 0);
    assert.match(result.errors[0], /같은 번호/);
  });
}

test("volume ZIP requires the final ZIP file", () => {
  const result = groupZipSelection(["photos.z01", "photos.z02"].map(file));
  assert.equal(result.inputs.length, 0);
  assert.match(result.errors[0], /photos\.zip 파일이 빠졌어요/);
});

test("duplicate final ZIP files are rejected", () => {
  const result = groupZipSelection(["photos.z01", "photos.zip", "PHOTOS.ZIP"].map(file));
  assert.equal(result.inputs.length, 0);
  assert.match(result.errors[0], /같은 번호/);
});

test("zero and unsafe piece numbers cannot cause an unbounded missing-piece scan", () => {
  for (const suffix of ["000", "9007199254740993"]) {
    const result = groupZipSelection([file(`photos.zip.${suffix}`)]);
    assert.equal(result.inputs.length, 0);
    assert.match(result.errors[0], /조각 번호/);
  }
});

test("independent split archives and normal files stay separate", () => {
  const photo = file("photo.png");
  const result = groupZipSelection([photo, ...["a.z01", "b.zip.002", "a.zip", "b.zip.001", "single.zip"].map(file)]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.inputs[0], photo);
  assert.deepEqual(result.inputs.slice(1).map((input) => input.kind), ["volumes", "numbered", "single"]);
});

test("invalid groups do not discard unrelated photos or complete archives", () => {
  const photo = file("photo.png");
  const result = groupZipSelection([file("broken.zip.002"), photo, file("valid.zip")]);
  assert.equal(result.errors.length, 1);
  assert.equal(result.inputs[0], photo);
  assert.equal(result.inputs[1].name, "valid.zip");
});

test("archive selection keys are stable when the picker order changes", () => {
  const files = ["photos.zip.001", "photos.zip.002", "photos.zip.003"].map(file);
  assert.equal(groupZipSelection(files).inputs[0].key, groupZipSelection([...files].reverse()).inputs[0].key);
});

test("same archive names in different relative directories are not mixed", () => {
  const files = ["a", "b"].flatMap((dir) => ["photos.z01", "photos.zip"].map((name) => {
    const part = file(name);
    Object.defineProperty(part, "webkitRelativePath", { value: `${dir}/${name}` });
    return part;
  }));
  const result = groupZipSelection(files);
  assert.deepEqual(result.errors, []);
  assert.equal(result.inputs.length, 2);
  assert.notEqual(result.inputs[0].key, result.inputs[1].key);
});

test("split ZIP extensions are recognized with or without a browser MIME type", () => {
  for (const name of ["photos.ZIP", "photos.Z01", "photos.zip.001", "photos.zip.1000"]) assert(isZipUpload(file(name)));
  for (const name of ["photo.jpg", "document.pdf", "archive.7z.001", "archive.rar"]) assert(!isZipUpload(file(name)));
});
