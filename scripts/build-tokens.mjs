/**
 * 디자인 토큰 빌드 — tokens/*.json → 생성 CSS 2개
 * 실행: npm run tokens:build
 *
 *   src/app/tokens.generated.css           브라우저가 읽는 CSS 변수. 라이트(:root) + 다크([data-theme="dark"])
 *   src/app/tokens.tailwind.generated.css  Tailwind가 읽는 @theme 브리지 + .type-* 타이포 유틸리티
 *
 * 값 파일은 어디서든 import해도 되고(layout.tsx), Tailwind 파일은 globals.css에서만 import한다.
 * 두 파일 모두 생성물이라 직접 수정하지 않는다. 토큰 원본은 tokens/global.json(비색상)·light.json·dark.json(디자이너 변수 60개).
 */
import { writeFileSync } from 'node:fs';
import StyleDictionary from 'style-dictionary';
import { register, expandTypesMap } from '@tokens-studio/sd-transforms';

register(StyleDictionary);

const tokenType = (token) => token.$type ?? token.type;
const tokenValue = (token) => token.$value ?? token.value;

// 팔레트 원색은 CSS로 내보내지 않는다(현재 global.json에 색은 없지만 규칙은 유지).
const isPaletteColor = (token) =>
  token.filePath.endsWith('global.json') && tokenType(token) === 'color';

// Tailwind v4 @theme 브리지 — 색 토큰마다 `--color-<이름>: var(--<이름>)` 한 줄.
StyleDictionary.registerFormat({
  name: 'css/tailwind-theme',
  format: ({ dictionary }) => {
    const lines = dictionary.allTokens
      .filter((t) => tokenType(t) === 'color')
      .map((t) => `  --color-${t.name}: var(--${t.name});`);
    return ['@theme inline {', ...lines, '}', ''].join('\n');
  },
});

// 타이포 토큰(확장된 font-size 등) → `.type-<이름>` 유틸리티.
// 서체는 토큰 값이 Montserrat면 --font-brand, 아니면 --font-sans(Pretendard).
StyleDictionary.registerFormat({
  name: 'css/type-utilities',
  format: ({ dictionary }) => {
    const groups = new Map();
    for (const t of dictionary.allTokens) {
      const m = t.name.match(
        /^(.+)-(font-family|font-weight|font-size|line-height|letter-spacing|text-case)$/,
      );
      if (!m) continue;
      const [, base, prop] = m;
      if (!groups.has(base)) groups.set(base, {});
      groups.get(base)[prop] = t;
    }
    const blocks = [];
    for (const [base, props] of groups) {
      if (!props['font-size']) continue;
      const family = /montserrat/i.test(String(tokenValue(props['font-family'] ?? {})))
        ? 'var(--font-brand)'
        : 'var(--font-sans)';
      const decl = [`font-family: ${family};`];
      if (props['font-weight']) decl.push(`font-weight: var(--${base}-font-weight);`);
      decl.push(`font-size: var(--${base}-font-size);`);
      if (props['line-height']) decl.push(`line-height: var(--${base}-line-height);`);
      if (props['letter-spacing']) decl.push(`letter-spacing: var(--${base}-letter-spacing);`);
      if (props['text-case']) decl.push(`text-transform: var(--${base}-text-case);`);
      blocks.push(`  .type-${base} {\n    ${decl.join('\n    ')}\n  }`);
    }
    return ['@layer utilities {', blocks.join('\n'), '}', ''].join('\n');
  },
});

const common = {
  preprocessors: ['tokens-studio'],
  // 타이포 복합 토큰은 개별 속성(--title-xl-font-size 등)으로 전개.
  expand: { include: ['typography'], typesMap: expandTypesMap },
};

const cssPlatform = (files) => ({
  css: {
    transformGroup: 'tokens-studio',
    transforms: ['name/kebab', 'shadow/css/shorthand'],
    files,
  },
});

// 라이트(기본): 시맨틱 컬러 + 비색상 토큰 전부 → :root / 브리지 / 타이포 유틸
const light = new StyleDictionary({
  ...common,
  source: ['tokens/global.json', 'tokens/light.json'],
  platforms: cssPlatform([
    {
      destination: 'vars',
      format: 'css/variables',
      filter: (token) => !isPaletteColor(token),
    },
    { destination: 'theme', format: 'css/tailwind-theme' },
    { destination: 'type', format: 'css/type-utilities' },
  ]),
});

// 다크: dark.json의 시맨틱 컬러만 → [data-theme="dark"]
const dark = new StyleDictionary({
  ...common,
  source: ['tokens/dark.json'],
  include: ['tokens/global.json'],
  platforms: cssPlatform([
    {
      destination: 'vars',
      format: 'css/variables',
      filter: (token) => token.filePath.endsWith('dark.json'),
      options: { selector: '[data-theme="dark"]' },
    },
  ]),
});

const [lightOut, darkOut] = await Promise.all([
  light.formatPlatform('css'),
  dark.formatPlatform('css'),
]);
const pick = (outputs, destination) => outputs.find((f) => f.destination === destination).output;
const header = (what) =>
  `/* 자동 생성 — tokens/*.json → ${what}. 직접 수정 금지: npm run tokens:build */\n\n`;

writeFileSync(
  'src/app/tokens.generated.css',
  header('CSS 변수 (라이트 :root + 다크 [data-theme="dark"])') +
    pick(lightOut, 'vars') +
    '\n' +
    pick(darkOut, 'vars'),
);
writeFileSync(
  'src/app/tokens.tailwind.generated.css',
  header('Tailwind @theme 브리지 + .type-* 유틸리티 — globals.css에서만 import') +
    pick(lightOut, 'theme') +
    '\n' +
    pick(lightOut, 'type'),
);
console.log('✔ built: src/app/tokens.generated.css, src/app/tokens.tailwind.generated.css');
