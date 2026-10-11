// 把 upstream 的版本号同步到本 fork（仅在上游版本更高时写回）
//
// 用法：node scripts/sync-upstream-version.mjs 2026.10.10
//
// 为什么不无条件写回：本 fork 有时会自己发一版（例如 2026.10.11）而上游还停在
// 2026.10.10，此时若照抄上游版本号，会把自己的版本号**降级**——插件商店会认为
// 装的是更高版本，发版 workflow 还会把同名 Release 覆盖掉。所以只在“上游更高”时跟随。
//
// 版本号形式为 `年.月.日`（可能带第 4 段），按数字逐段比较，不做语义化版本解析。

import { readFileSync, writeFileSync } from 'node:fs';

const next = (process.argv[2] || '').trim();
if (!/^\d+(\.\d+){2,3}$/.test(next)) {
  console.error(`[sync-version] 非法版本号: "${next}"（期望形如 2026.10.10）`);
  process.exit(1);
}

function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

for (const file of ['plugin.json', 'package.json']) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  if (compare(next, pkg.version) <= 0) {
    console.log(`[sync-version] ${file} 保持 ${pkg.version}（不低于上游 ${next}）`);
    continue;
  }
  const before = pkg.version;
  pkg.version = next;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[sync-version] ${file}: ${before} → ${next}`);
}
