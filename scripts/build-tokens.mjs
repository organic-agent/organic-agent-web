import StyleDictionary from 'style-dictionary';
import { register, expandTypesMap } from '@tokens-studio/sd-transforms';

register(StyleDictionary);

// 팔레트 원색(gray.600 등)은 CSS로 내보내지 않는다.
// 컴포넌트는 시맨틱 토큰(bg/fg/stroke)만 쓴다는 규칙을 구조적으로 강제하기 위함.
const isPaletteColor = (token) =>
  token.filePath.endsWith('global.json') && (token.$type ?? token.type) === 'color';

const common = {
  preprocessors: ['tokens-studio'],
  // 타이포 복합 토큰은 개별 속성(--display-hero-font-size 등)으로 전개.
  // font 축약형은 letterSpacing·textCase를 담지 못해 정보가 소실된다.
  expand: { include: ['typography'], typesMap: expandTypesMap },
};

const cssPlatform = (destination, extra = {}) => ({
  css: {
    transformGroup: 'tokens-studio',
    transforms: ['name/kebab', 'shadow/css/shorthand'],
    buildPath: 'src/app/',
    files: [{ destination, format: 'css/variables', ...extra }],
  },
});

// 라이트(기본) 테마: 시맨틱 컬러 + 비색상 토큰 전부 → :root
const light = new StyleDictionary({
  ...common,
  source: ['tokens/global.json', 'tokens/light.json'],
  platforms: cssPlatform('tokens.css', {
    filter: (token) => !isPaletteColor(token),
  }),
});

// 다크 테마: dark 세트의 시맨틱 컬러만 → [data-theme="dark"]
const dark = new StyleDictionary({
  ...common,
  source: ['tokens/dark.json'],
  include: ['tokens/global.json'],
  platforms: cssPlatform('tokens.dark.css', {
    filter: (token) => token.filePath.endsWith('dark.json'),
    options: { selector: '[data-theme="dark"]' },
  }),
});

await light.buildAllPlatforms();
await dark.buildAllPlatforms();
console.log('✔ built: src/app/tokens.css, src/app/tokens.dark.css');
