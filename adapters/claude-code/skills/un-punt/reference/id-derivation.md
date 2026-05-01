# ID derivation

Item IDs are content-derived: same `(type, file_path, line)` triple always produces the same ID. This is what makes "is this a re-detection or a new item?" answerable without an index file.

## Algorithm

```
id = "up-" + first_8_chars( sha256(type + ":" + file_path + ":" + line) )
```

Inputs:
- **`type`** — the item type as it appears in frontmatter: `deferred-implementation`, `type-loosened`, `skipped-test`, `hack-workaround`, `duplicated-code`, `other`.
- **`file_path`** — repo-relative path, forward slashes (e.g. `src/auth/oauth.ts`). Never absolute, never with `./` prefix.
- **`line`** — line number as a decimal integer string (e.g. `142`). For non-line-anchored items use `0`.

Output: 11 chars — `up-` prefix + 8 lowercase hex.

## Bash one-liner (portable: macOS + Linux)

```bash
id="up-$(printf '%s:%s:%s' "$type" "$file_path" "$line" | shasum -a 256 | cut -c1-8)"
```

`shasum -a 256` is on every macOS install; Linux distributions ship it under coreutils. `sha256sum` works on Linux only — don't use it.

## Properties the lifecycle relies on

- **Same `(type, file_path, line)` discovered twice** → same ID → `.un-punt/items/<id>.md` already exists → append a `re-capture` row to the lifecycle table; do not overwrite.
- **Item drifts to a different line** → new ID → new file. Optionally append a final `moved-to: up-<new>` row to the old file when the move is observable.
- **Resolved item re-detected** → same ID → status flips from `resolved` back to `open` (regression). Append a row.

## Examples

| `type` | `file_path` | `line` | sha256 (first 8) | id |
|---|---|---|---|---|
| `type-loosened` | `src/auth/oauth.ts` | `142` | (computed) | `up-<8hex>` |
| `skipped-test` | `tests/billing.test.ts` | `89` | (computed) | `up-<8hex>` |
| `deferred-implementation` | `pkg/handler.go` | `0` | (computed) | `up-<8hex>` |

The agent computes these at capture time and never relies on a precomputed table.
