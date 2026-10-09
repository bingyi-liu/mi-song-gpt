// Windows 本地构建补丁
//
// 背景：`@songloft/plugin-builder` 在构建时用 `execFileSync('npm.cmd', …)` 安装/构建
// frontend（node_modules/@songloft/plugin-builder/dist/{index,cli}.js）。Node 自
// 18.20.2 / 20.12.2 起出于安全考虑禁止不经 shell 直接执行 `.cmd`/`.bat`，于是
// Windows 上执行 `npm run build` 必然报：
//
//     📦 Installing frontend dependencies...
//     spawnSync npm.cmd EINVAL
//
// 本脚本把 builder 的两处调用改为 `process.execPath` + `npm-cli.js`（`npm run`/`npm ci`
// 会通过环境变量 `npm_execpath` 暴露该路径），既不需要 shell，也不依赖 `.cmd`。
//
// 脚本幂等：找不到待替换的模式（例如 builder 后续版本自行修复）时静默跳过；
// 非 Windows 平台直接退出（Linux/macOS 不受影响）。

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') process.exit(0);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['dist/index.js', 'dist/cli.js'].map((file) =>
  join(root, 'node_modules', '@songloft', 'plugin-builder', file),
);

const ANCHOR = 'var NPM = process.platform === "win32" ? "npm.cmd" : "npm";';
const RUNNER = `${ANCHOR}
function runNpm(args, options) {
  const npmCli = process.env.npm_execpath;
  if (typeof npmCli === "string" && /\\.(c|m)?js$/.test(npmCli)) {
    return execFileSync(process.execPath, [npmCli, ...args], options);
  }
  return execFileSync(NPM, args, options);
}`;
const REPLACEMENTS = [
  ['execFileSync(NPM, ["install"], { cwd: frontendDir, stdio: "inherit" });', 'runNpm(["install"], { cwd: frontendDir, stdio: "inherit" });'],
  ['execFileSync(NPM, ["run", "build"], { cwd: frontendDir, stdio: "inherit" });', 'runNpm(["run", "build"], { cwd: frontendDir, stdio: "inherit" });'],
];

let patched = 0;
for (const file of targets) {
  if (!existsSync(file)) continue;
  const before = readFileSync(file, 'utf8');
  if (!before.includes(ANCHOR) || before.includes('function runNpm(')) continue;
  let text = before.replace(ANCHOR, RUNNER);
  for (const [from, to] of REPLACEMENTS) text = text.split(from).join(to);
  if (text !== before) {
    writeFileSync(file, text, 'utf8');
    patched += 1;
  }
}

if (patched > 0) {
  console.log(`[patch-plugin-builder] 已为 Windows 修复 @songloft/plugin-builder（${patched} 个文件）`);
}
