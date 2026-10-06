export type ZipSelection = {
  name: string;
  kind: "single" | "volumes" | "numbered";
  parts: File[];
  key: string;
};

type Part = { file: File; number: number };
type Group = {
  name: string;
  kind: "volumes" | "numbered";
  padding: number;
  parts: Part[];
  finals: File[];
};

function scope(file: File): string {
  return file.webkitRelativePath?.slice(0, -file.name.length).normalize("NFC").toLowerCase() ?? "";
}

function groupKey(file: File, name: string, kind: Group["kind"]): string {
  return JSON.stringify([scope(file), kind, name.normalize("NFC").toLowerCase()]);
}

export function isZipUpload(file: File): boolean {
  return /(?:\.zip|\.z\d+|\.zip\.\d+)$/i.test(file.name)
    || ["application/zip", "application/x-zip-compressed"].includes(file.type.toLowerCase());
}

function selection(name: string, kind: ZipSelection["kind"], parts: File[]): ZipSelection {
  return { name, kind, parts, key: JSON.stringify([kind, parts.map((file) => [file.webkitRelativePath || file.name, file.size, file.lastModified])]) };
}

/** 조각 순서는 선택 순서가 아니라 번호로 정한다. 완성되지 않은 묶음은 통째로 제외한다. */
export function groupZipSelection(files: File[]): { inputs: (File | ZipSelection)[]; errors: string[] } {
  const groups = new Map<string, Group>();
  const belongsTo = new Map<File, string>();
  for (const file of files) {
    const numbered = /^(.*\.zip)\.(\d+)$/i.exec(file.name);
    const volume = /^(.*)\.z(\d+)$/i.exec(file.name);
    const match = numbered ?? volume;
    if (!match) continue;
    const kind = numbered ? "numbered" : "volumes";
    const name = numbered ? match[1] : `${match[1]}.zip`;
    const key = groupKey(file, name, kind);
    const group = groups.get(key) ?? { name, kind, padding: match[2].length, parts: [], finals: [] };
    group.parts.push({ file, number: Number(match[2]) });
    groups.set(key, group);
    belongsTo.set(file, key);
  }
  for (const file of files) {
    if (!/\.zip$/i.test(file.name)) continue;
    const key = groupKey(file, file.name, "volumes");
    const group = groups.get(key);
    if (group) {
      group.finals.push(file);
      belongsTo.set(file, key);
    }
  }

  const inputs: (File | ZipSelection)[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const key = belongsTo.get(file);
    if (!key) {
      inputs.push(isZipUpload(file) ? selection(file.name, "single", [file]) : file);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const group = groups.get(key)!;
    const parts = group.parts.toSorted((a, b) => a.number - b.number);
    if (parts.some((part) => !Number.isSafeInteger(part.number) || part.number < 1)) {
      errors.push(`${group.name}의 조각 번호가 올바르지 않아요. 첫 조각부터 마지막 조각까지 모두 선택해 주세요.`);
      continue;
    }
    if (new Set(parts.map((part) => part.number)).size !== parts.length || group.finals.length > 1) {
      errors.push(`${group.name}의 같은 번호 조각이 여러 개예요. 같은 압축 파일의 조각을 하나씩만 선택해 주세요.`);
      continue;
    }
    const gap = parts.findIndex((part, index) => part.number !== index + 1);
    if (gap !== -1) {
      const number = String(gap + 1).padStart(group.padding, "0");
      const missing = group.kind === "numbered" ? `${group.name}.${number}` : `${group.name.slice(0, -4)}.z${number}`;
      errors.push(`${missing} 파일이 빠졌어요. 분할 ZIP의 모든 조각을 한 번에 선택해 주세요.`);
      continue;
    }
    if (group.kind === "volumes" && group.finals.length === 0) {
      errors.push(`${group.name} 파일이 빠졌어요. .z01부터 마지막 .zip까지 모두 선택해 주세요.`);
      continue;
    }
    inputs.push(selection(group.name, group.kind, [...parts.map((part) => part.file), ...group.finals]));
  }
  return { inputs, errors };
}
