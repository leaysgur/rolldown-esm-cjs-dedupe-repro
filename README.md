# Rolldown Issue Repro Memo

## Summary

When a package provides conditional exports (`.mjs` for ESM / `.cjs` for CJS), and consumers import the same subpath via both ESM `import()` and CJS `require()`, rolldown bundles **both variants** as separate module graph nodes instead of deduplicating them.

This causes:
- Duplicated module code in the output (increased bundle size)
- Broken module identity (two separate instances of the same logical module)
- In complex chunk graphs (e.g., tsdown with multiple entries), broken `__esmMin` init wrappers → `TypeError: init_xxx is not a function`

## Minimal Reproduction

### Structure

```
packages/
  pkg-shared/          # Provides conditional exports
    package.json       # "./utils": { "require": "./utils.cjs", "default": "./utils.mjs" }
    utils.mjs          # ESM variant
    utils.cjs          # CJS variant (same logical module)
  pkg-esm/             # ESM consumer: import("pkg-shared/utils")
    index.js
  pkg-cjs/             # CJS consumer: require("pkg-shared/utils")
    index.js
src/
  entry-min.js         # imports both pkg-esm and pkg-cjs
rolldown.config.min.js # single entry, ESM output, platform: "node"
```

### Run

```sh
npm install
npx rolldown --config rolldown.config.min.js
```

### Observed output

`dist-min/` contains:

- `entry-min.js` — includes `pkg-shared/utils.cjs` (CJS variant, inlined)
- `utils-DHebi9xQ.js` — includes `pkg-shared/utils.mjs` (ESM variant, separate chunk)

Both variants of the same logical module are bundled. Running `node dist-min/entry-min.js` outputs:

```
[pkg-esm] hello from ESM 42
[pkg-cjs] hello from CJS 42
```

The "from ESM" / "from CJS" difference proves two separate module instances exist.

### Expected behavior

Only one variant should be bundled. Both consumers should share the same module instance.

## Real-World Reproduction (prettier)

### Setup

```sh
npx rolldown --config rolldown.config.js
```

- `src/entry-combined.js` — imports both `prettier` (ESM) and `prettier-plugin-svelte` (CJS)
- `rolldown.config.js` — single entry, ESM output, `platform: "node"`

### What happens

`prettier` has conditional exports for its plugins:

```jsonc
// prettier/package.json
"./plugins/babel": {
  "require": "./plugins/babel.js",
  "default": "./plugins/babel.mjs"
}
```

Two consumers reach the same logical module through different conditions:

1. **prettier itself** (ESM): `import("./plugins/babel.mjs")` → resolves to `babel.mjs`
2. **prettier-plugin-svelte** (CJS): `require('prettier/plugins/babel')` → resolves to `babel.js`

### Observed output

Three modules are duplicated (ESM in shared chunks, CJS inlined into entry):

| Module | ESM variant (shared chunk) | CJS variant (entry chunk) |
|---|---|---|
| `prettier` core | `prettier/index.mjs` (591 kB) | `prettier/index.cjs` |
| `prettier/doc` | `prettier/doc.mjs` | `prettier/doc.js` |
| `prettier/plugins/babel` | `prettier/plugins/babel.mjs` (383 kB) | `prettier/plugins/babel.js` |

## Root Cause (source code analysis)

Rolldown uses **separate resolvers** with different condition names for `import` vs `require`:

**`crates/rolldown_resolver/src/resolver_config.rs`** (L42-48):
```rust
let mut import_conditions = vec!["import".to_string()];  // → .mjs
let mut require_conditions = vec!["require".to_string()]; // → .cjs
```

**`crates/rolldown_resolver/src/resolver.rs`** (L137-151):
```rust
let selected_resolver = match import_kind {
    ImportKind::Import | ImportKind::DynamicImport => &self.import_resolver,
    ImportKind::Require => &self.require_resolver,
    ...
};
```

Module deduplication in `crates/rolldown/src/module_loader/module_loader.rs` (L200-236) uses the **resolved absolute file path** as the cache key (`ModuleId`). Since `.mjs` ≠ `.cjs`, two separate module graph nodes are created.

## Related Issues

- [#1507](https://github.com/rolldown/rolldown/issues/1507) (Closed) — Dual Package Hazard discussion. Rolldown chose webpack-style behavior (ESM-preferred) over esbuild-style (dedup to CJS). Does not address conditional exports creating duplicate bundles.
- [#3000](https://github.com/rolldown/rolldown/issues/3000) (Open) — Supporting multiple module instances for the same file. Same underlying 1:1 file↔node architecture limitation.
- [#8361](https://github.com/rolldown/rolldown/issues/8361), [#4976](https://github.com/rolldown/rolldown/issues/4976), [#7977](https://github.com/rolldown/rolldown/issues/7977) — Symptoms of broken `__commonJSMin` / `__esmMin` wrappers in code-split chunks.

## Workaround

Force deduplication via `resolve.alias`, pointing to the `.mjs` (ESM) variant:

```js
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// rolldown config
{
  resolve: {
    alias: {
      // Point to .mjs so both ESM and CJS consumers share the ESM variant.
      // Using .js (CJS) also fixes runtime errors, but both variants still get bundled.
      "prettier/plugins/babel": require.resolve("prettier/plugins/babel").replace(".js", ".mjs"),
    }
  }
}
```

Note: `require.resolve()` returns the CJS entry (`.js`) due to Node's resolution rules, so `.replace(".js", ".mjs")` is needed to target the ESM variant and avoid duplication.

## Environment

- rolldown v1.0.0-rc.6
- Node.js v24.10.0
- ESM output format
