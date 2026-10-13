#!/usr/bin/env node
// Sinh CSS variables từ design/tokens.json (bản sao của doc/design/tokens.json) cho cả hai web.
//
//   npm run gen:tokens     (ở thư mục gốc repo) ghi src/styles/tokens.css và src/styles/theme.css của gói dùng chung
//   npm run check:tokens   chỉ so sánh, lệch thì thoát mã 1 (dùng trong CI / test)
//
// Ba lớp màu giữ đúng kiến trúc màu của design system:
//   primitive  --color-<thang>-<bậc>          (chỉ là giá trị, component không đọc trực tiếp)
//   semantic   --dsv-color-<vai-trò>          (trỏ về primitive khi trùng giá trị)
//   component  --dsv-<component>-<vai-trò>    (trỏ về semantic hoặc primitive theo "ref")
// Dark mode chỉ bật trong vùng có [data-theme="dark"] hoặc [data-theme="system"] + OS tối,
// không đặt ở :root toàn cục.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TOKENS_PATH = resolve(ROOT, 'design/tokens.json');
export const OUTPUT = {
  tokens: resolve(ROOT, 'src/styles/tokens.css'),
  theme: resolve(ROOT, 'src/styles/theme.css'),
};

const HEADER = (what) =>
  `/* TỆP SINH TỰ ĐỘNG — KHÔNG SỬA TAY.\n` +
  ` * Nguồn: design/tokens.json · Lệnh: npm run gen:tokens\n` +
  ` * ${what}\n */\n`;

// Tên CSS của một số token component khác quy tắc chung (theo bảng tên token của design system).
const COMPONENT_NAME_OVERRIDES = {
  'sectionHeading.fg': '--dsv-section-heading-fg',
  'sectionHeading.subfg': '--dsv-section-subheading-fg',
  'verified.unverified-fg': '--dsv-unverified-fg',
  'verified.unverified-bg': '--dsv-unverified-bg',
};

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const isMeta = (key) => key.startsWith('$');
const entries = (obj) => Object.entries(obj).filter(([k]) => !isMeta(k));
const norm = (v) => String(v).replace(/\s+/g, '').toLowerCase();
const px = (n) => (typeof n === 'number' ? (n === 0 ? '0' : `${n}px`) : String(n));

function primitiveName(scale, step) {
  return scale === 'absolute' ? `--color-${step}` : `--color-${scale}-${step}`;
}

function collectPrimitives(tokens) {
  const list = [];
  for (const [scale, steps] of entries(tokens.color.primitive)) {
    for (const [step, def] of entries(steps)) {
      list.push({ key: `${scale}.${step}`, name: primitiveName(scale, step), value: def.value });
    }
  }
  return list;
}

// Semantic trỏ về primitive khi cùng giá trị; "ref" (vd "lacquer.600 / lacquer.300") dùng để chọn khi trùng nhiều bậc.
function resolveToPrimitive(value, refHint, primitives) {
  const candidates = primitives.filter((p) => norm(p.value) === norm(value));
  if (candidates.length === 0) return value;
  const hinted = candidates.find((p) => refHint.includes(p.key) || refHint.includes(p.key.replace('absolute.', '')));
  return `var(${(hinted ?? candidates[0]).name})`;
}

function collectSemantic(tokens, primitives) {
  const list = [];
  for (const [, group] of entries(tokens.color.semantic)) {
    if (typeof group !== 'object' || Array.isArray(group)) continue;
    for (const [key, def] of entries(group)) {
      const [lightRef = '', darkRef = ''] = String(def.ref ?? '').split('/').map((s) => s.trim());
      list.push({
        name: `--dsv-color-${key}`,
        light: resolveToPrimitive(def.light, lightRef, primitives),
        dark: resolveToPrimitive(def.dark, darkRef || lightRef, primitives),
        darkDiffers: norm(def.light) !== norm(def.dark),
      });
    }
  }
  return list;
}

function refToVar(ref, primitives) {
  const [layer, ...rest] = ref.split('.');
  if (layer === 'semantic') return `var(--dsv-color-${rest[rest.length - 1]})`;
  if (layer === 'primitive') {
    const key = rest.join('.');
    const found = primitives.find((p) => p.key === key);
    if (!found) throw new Error(`tokens.json: không tìm thấy primitive "${ref}"`);
    return `var(${found.name})`;
  }
  throw new Error(`tokens.json: ref không hợp lệ "${ref}"`);
}

function collectComponent(tokens, primitives) {
  const list = [];
  for (const [group, roles] of entries(tokens.color.component)) {
    if (typeof roles !== 'object') continue;
    for (const [role, def] of entries(roles)) {
      const id = `${group}.${role}`;
      const name = COMPONENT_NAME_OVERRIDES[id] ?? `--dsv-${kebab(group)}-${role}`;
      list.push({ name, value: def.ref ? refToVar(def.ref, primitives) : def.value });
    }
  }
  return list;
}

function block(selector, lines, indent = '') {
  const body = lines.map((l) => (l ? `${indent}  ${l}` : '')).join('\n');
  return `${indent}${selector} {\n${body}\n${indent}}\n`;
}

export function generate(tokens) {
  const primitives = collectPrimitives(tokens);
  const semantic = collectSemantic(tokens, primitives);
  const component = collectComponent(tokens, primitives);
  const { typography, spacing, layoutConstant, radius, shadow, border, motion, zIndex, breakpoint } = tokens;

  const root = [];
  root.push('/* Primitive */');
  for (const p of primitives) root.push(`${p.name}: ${p.value};`);
  root.push('', '/* Semantic (light) */');
  for (const s of semantic) root.push(`${s.name}: ${s.light};`);
  root.push('', '/* Component */');
  for (const c of component) root.push(`${c.name}: ${c.value};`);

  root.push('', '/* Typography */');
  for (const [fam, def] of entries(typography.family)) root.push(`--dsv-font-${fam}: ${def.value};`);
  for (const [role, def] of entries(typography.role)) {
    root.push(`--dsv-text-${role}-size: ${px(def.fontSize)};`);
    root.push(`--dsv-text-${role}-line-height: ${px(def.lineHeight)};`);
    root.push(`--dsv-text-${role}-weight: ${def.fontWeight};`);
    root.push(`--dsv-text-${role}-tracking: ${def.letterSpacing};`);
  }

  root.push('', '/* Spacing (bậc 4px) */');
  for (const [step, def] of entries(spacing)) root.push(`--dsv-space-${step}: ${px(def.value)};`);

  root.push('', '/* Hằng số nhịp và bố cục */');
  for (const [key, def] of entries(layoutConstant)) root.push(`--dsv-${key}: ${px(def.value)};`);

  root.push('', '/* Bo góc */');
  for (const [key, def] of entries(radius)) root.push(`--dsv-radius-${key}: ${px(def.value)};`);

  root.push('', '/* Đổ bóng (luôn hai lớp) */');
  for (const [key, def] of entries(shadow)) root.push(`--dsv-shadow-${key}: ${def.value};`);

  root.push('', '/* Đường viền */');
  const borders = entries(border).map(([key, def]) => ({
    name: `--dsv-border-${key}`,
    value: def.value.replace(/\{color\.semantic\.[^.]+\.([^}]+)\}/g, 'var(--dsv-color-$1)'),
  }));
  for (const b of borders) root.push(`${b.name}: ${b.value};`);

  root.push('', '/* Chuyển động */');
  for (const [key, def] of entries(motion.duration)) root.push(`--dsv-duration-${key}: ${def.value};`);
  for (const [key, def] of entries(motion.easing)) root.push(`--dsv-ease-${key}: ${def.value};`);
  for (const [key, def] of entries(motion.stagger)) root.push(`--dsv-stagger-${key}: ${def.value};`);
  root.push(`--dsv-card-hover-scale: ${motion.cardHoverScale.value};`);
  root.push(`--dsv-text-fade-in-start: ${motion.textFadeInStart.value};`);

  root.push('', '/* z-index */');
  for (const [key, def] of entries(zIndex)) root.push(`--dsv-z-${key}: ${def.value};`);

  const darkSemantic = semantic.filter((s) => s.darkDiffers);
  // Giá trị var() của một custom property được tính ngay tại phần tử khai báo nó (:root) rồi mới truyền xuống, nên token component
  // và đường viền trỏ về token ngữ nghĩa mang màu sáng vào cả vùng dark (ô nhập nền trắng chữ sáng, mục menu đang chọn hồng nhạt)
  // trừ khi vùng dark khai báo lại chúng. Khai báo lại đúng những token trỏ tới token ngữ nghĩa có bản dark.
  const darkNames = new Set(darkSemantic.map((s) => s.name));
  const refersToDark = (value) => [...String(value).matchAll(/var\((--dsv-color-[a-z0-9-]+)\)/g)].some((m) => darkNames.has(m[1]));
  const darkDerived = [...component, ...borders].filter((t) => refersToDark(t.value));
  const darkLines = [
    ...darkSemantic.map((s) => `${s.name}: ${s.dark};`),
    '',
    '/* Token component và đường viền trỏ về token ngữ nghĩa có bản dark */',
    ...darkDerived.map((t) => `${t.name}: ${t.value};`),
  ];
  const sectionPad = layoutConstant['section-pad-y'];

  let tokensCss = HEADER(
    `${primitives.length} primitive · ${semantic.length} semantic · ${component.length} component · ` +
      `${darkSemantic.length} ghi đè dark (+${darkDerived.length} token dẫn xuất khai báo lại)`,
  );
  tokensCss += '\n' + block(':root', root);
  tokensCss +=
    `\n@media (min-width: ${sectionPad.breakpoint}px) {\n` +
    block(':root', [`--dsv-section-pad-y: ${px(sectionPad.valueDesktop)};`], '  ') +
    '}\n';
  tokensCss += `\n/* Dark mode chỉ trong vùng được phép (khu quản trị hệ thống, màn hình toàn màn) */\n`;
  tokensCss += block('[data-theme="dark"]', darkLines);
  tokensCss += `\n@media (prefers-color-scheme: dark) {\n${block('[data-theme="system"]', darkLines, '  ')}}\n`;

  // Theme Tailwind v4: chỉ lộ lớp semantic làm utility màu; primitive không có utility (component không được dùng).
  const theme = [];
  theme.push('--color-*: initial;');
  for (const s of semantic) theme.push(`--color-${s.name.replace('--dsv-color-', '')}: var(${s.name});`);
  theme.push('');
  for (const fam of Object.keys(typography.family)) theme.push(`--font-${fam}: var(--dsv-font-${fam});`);
  theme.push('--font-weight-*: initial;');
  theme.push('--font-weight-regular: 400;', '--font-weight-medium: 500;', '--font-weight-bold: 700;');
  theme.push('--text-*: initial;');
  theme.push('');
  theme.push('--radius-*: initial;');
  for (const key of Object.keys(radius)) theme.push(`--radius-${key}: var(--dsv-radius-${key});`);
  theme.push('--shadow-*: initial;');
  for (const [key] of entries(shadow)) if (key !== 'none') theme.push(`--shadow-${key}: var(--dsv-shadow-${key});`);
  for (const key of Object.keys(motion.easing)) theme.push(`--ease-${key}: var(--dsv-ease-${key});`);
  theme.push('');
  for (const [key, def] of entries(breakpoint.css)) theme.push(`--breakpoint-${key}: ${def.value}px;`);

  let themeCss = HEADER('Ánh xạ token sang theme Tailwind v4 (utility màu, chữ, bo góc, bóng, breakpoint dsv*).');
  themeCss += '\n' + block('@theme inline', theme);
  themeCss += '\n/* Một utility cho mỗi vai trò chữ: type-h1, type-body-m, type-control, type-label-kicker… */\n';
  for (const [role, def] of entries(typography.role)) {
    const lines = [
      `font-family: var(--dsv-font-${def.family});`,
      `font-size: var(--dsv-text-${role}-size);`,
      `line-height: var(--dsv-text-${role}-line-height);`,
      `font-weight: var(--dsv-text-${role}-weight);`,
      `letter-spacing: var(--dsv-text-${role}-tracking);`,
    ];
    if (def.textTransform) lines.push(`text-transform: ${def.textTransform};`);
    themeCss += '\n' + block(`@utility type-${role}`, lines);
  }
  return { tokensCss, themeCss };
}

export function readTokens(path = TOKENS_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Nội dung hai tệp CSS đang có trên đĩa (rỗng nếu chưa sinh). Bỏ qua khác biệt CRLF/LF khi so sánh. */
export function readOutputs() {
  const read = (file) => {
    try {
      return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    } catch {
      return '';
    }
  };
  return { tokensCss: read(OUTPUT.tokens), themeCss: read(OUTPUT.theme) };
}

function main() {
  const check = process.argv.includes('--check');
  const { tokensCss, themeCss } = generate(readTokens());
  const outputs = [
    [OUTPUT.tokens, tokensCss],
    [OUTPUT.theme, themeCss],
  ];
  if (check) {
    const stale = outputs.filter(([file, content]) => {
      try {
        return readFileSync(file, 'utf8') !== content;
      } catch {
        return true;
      }
    });
    if (stale.length) {
      console.error(`Lệch với design/tokens.json: ${stale.map(([f]) => f).join(', ')}. Chạy: npm run gen:tokens`);
      process.exit(1);
    }
    console.log('Token CSS khớp design/tokens.json.');
    return;
  }
  for (const [file, content] of outputs) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content, 'utf8');
    console.log(`Đã ghi ${file}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
