# Swivel Grid Roadmap

**Status: planned, not implemented.** Today the component is a single file (`SwivelGrid.js`, about 1,260 lines). Nothing below has been built yet. This replaces `REFACTORING_PLAN.md`, whose phase headers were marked done while none of its tasks had been started.

## Goals

- Split the component into a small core plus optional extensions, without breaking the current public API.
- Size targets (estimates, to be measured): core around 350 lines; standard bundle around 750 lines; full bundle equal to today's feature set.
- Add the missing safety net first: automated tests and CI.

## Next up

1. **Tests and CI.** Unit tests (jsdom or a real browser runner) covering layout switching, sorting, rating and image parsing, pagination guards, template escaping and search binding. Run them in GitHub Actions.
2. **Fix known limitations.**
   - Style `headerClass` and `cellClass` from outside the Shadow DOM (for example via `::part` or an injected stylesheet).
   - Replace the per-frame row measurement in scroll handling with a cheaper approach.
   - Preserve scroll position across re-renders.
3. **Template safety.** Replace the regex filter with a real sanitizer, or document templates as trusted input only.
4. **Packaging.** Fix `package.json` (`main`, `exports`, `files`, author), add a minimal build, publish to npm.

## Modularization (after tests exist)

Each step must keep the existing demo and tests passing.

| Phase | Work | Status |
|---|---|---|
| 1 | Extension registration and render hooks in the core | Planned |
| 2 | Extract layout rendering (table and grid) | Planned |
| 3 | Extract sorting | Planned |
| 4 | Extract search binding | Planned |
| 5 | Extract templates and CSS-class handling | Planned |
| 6 | Extract pagination and load-more | Planned |
| 7 | Extract accessibility helpers | Planned |
| 8 | Fold `rating` and `image` column types into the template system, with a deprecation path | Planned |
| 9 | Standard and full bundles | Planned |

## Later

- Row virtualization (fixed row height first, then variable height) for large datasets.
- Custom bundle builder and preset configurations.
- Changelog and versioned releases.

## Success criteria

- No breaking changes in the full bundle.
- All tests pass on every phase.
- Measured (not estimated) bundle sizes recorded in the README.