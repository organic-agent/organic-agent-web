/**
 * 아이콘 생성 — Material Symbols Rounded(weight 300, fill off, 24dp) → src/components/icons.tsx
 * 실행: npm run icons:build
 *
 * 디자인 시스템 v2(디자이너 파일 Iconography 페이지)가 Material Symbols Rounded 300을 쓴다.
 * 디자이너는 같은 라이브러리를 피그마 플러그인으로 쓰므로, 여기 이름과 피그마 이름이 같으면 모양도 같다.
 * @material-symbols/svg-300 패키지의 SVG에서 path만 뽑아 currentColor 컴포넌트로 만든다.
 * 컴포넌트 이름·props(size, ...svg)는 v1 icons.tsx와 동일하게 유지해 사용처 수정이 없다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const DIR = join(dirname(require.resolve('@material-symbols/svg-300/package.json')), 'rounded');

// [컴포넌트 이름, 심볼 이름, 옵션] — 옵션 flipY: 세로 반전(역정렬)
const ICONS = [
  ['ArrowRightIcon', 'arrow_forward'],
  ['ArrowDownIcon', 'arrow_downward'],
  ['UploadIcon', 'upload'],
  ['UsersIcon', 'group'],
  ['CompareIcon', 'compare'],
  ['CollabIcon', 'diversity_3'], // 확인 항목: 협업 아이콘은 디자이너 시안에 없음
  ['CommentIcon', 'chat_bubble'],
  ['ReactionIcon', 'add_reaction'],
  ['DocIcon', 'description'],
  ['MenuIcon', 'menu'],
  ['PanelIcon', 'right_panel_open'],
  ['SortIcon', 'sort'],
  ['SortInverseIcon', 'sort', { flipY: true }],
  ['GridLargeIcon', 'grid_view'],
  ['GridSmallIcon', 'view_module'],
  ['SingleViewIcon', 'crop_square'], // 확인 항목
  ['BellIcon', 'notifications'],
  ['ShareIcon', 'share'],
  ['InfoIcon', 'info'],
  ['HeartIcon', 'favorite'],
  ['HeartFillIcon', 'favorite-fill'],
  ['DropdownIcon', 'keyboard_arrow_down'], // expand_more와 같은 글리프(별칭)
  ['StarIcon', 'kid_star'], // 디자이너 시안 사용
  ['StarFillIcon', 'kid_star-fill'],
  ['PhotoIcon', 'image'],
  ['PlusIcon', 'add'],
  ['SparkleIcon', 'wand_stars'], // 확인 항목: AI 셀렉 아이콘은 디자이너 답 받은 뒤 확정
  ['SettingIcon', 'settings'],
  ['CloseIcon', 'close'],
  ['LinkIcon', 'link'],
  ['LockIcon', 'lock'],
  ['SlideshowIcon', 'slideshow'],
  ['BackIcon', 'arrow_back'],
  ['HomeIcon', 'home'],
  ['MoreIcon', 'more_horiz'],
  ['FilterIcon', 'filter_list'],
  ['TrashIcon', 'delete'],
  ['DarkModeIcon', 'dark_mode'],
  ['LightModeIcon', 'light_mode'],
  ['ZoomInIcon', 'zoom_in'],
  ['AddCommentIcon', 'add_comment'],
  ['TuneIcon', 'tune'],
];

const paths = (symbol) => {
  const svg = readFileSync(join(DIR, `${symbol}.svg`), 'utf8');
  const ds = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  if (ds.length === 0) throw new Error(`path 없음: ${symbol}`);
  return ds;
};

const components = ICONS.map(([name, symbol, opts = {}]) => {
  const inner = paths(symbol)
    .map((d) => `      <path d="${d}" />`)
    .join('\n');
  const body = opts.flipY
    ? `      <g transform="matrix(1 0 0 -1 0 -960)">\n${inner.replace(/^      /gm, '        ')}\n      </g>`
    : inner;
  return `/** Material Symbols: ${symbol}${opts.flipY ? ' (세로 반전)' : ''} */
export function ${name}(props: IconProps) {
  return (
    <IconBase {...props}>
${body}
    </IconBase>
  );
}`;
});

const out = `/**
 * 디자인 시스템 v2 아이콘 세트 — Material Symbols Rounded (weight 300, fill off, 24dp)
 * 위치: src/components/icons.tsx
 *
 * 자동 생성 파일 — 직접 수정하지 말고 scripts/build-icons.mjs의 매핑을 고친 뒤 \`npm run icons:build\`.
 * 글리프는 채움(fill) 도형이라 색은 currentColor(fill)로 부모 텍스트 색을 따른다.
 * 크기는 size prop(px, 기본 24). 나머지 svg 속성은 스프레드로 전달.
 */

import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({
  size = 24,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

${components.join('\n\n')}
`;

writeFileSync('src/components/icons.tsx', out);
console.log(`✔ icons.tsx: ${ICONS.length} icons (Material Symbols Rounded 300)`);
