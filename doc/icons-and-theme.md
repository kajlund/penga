# Icons and calm theme

Penga uses Lucide 1.49.0 SVG line icons through the typed registry and renderer in
`apps/web/src/components/icons.ts`. Only the selected named glyphs are bundled;
there is no React dependency or runtime CDN. The ISC and inherited Feather MIT
notices ship at `/licenses/lucide.txt` in the production frontend.

The registry accepts stable `lucide:<key>` choices, recognised bare keys and legacy
emoji (including presentation-selector variants). Explicit choices take priority
over account-type defaults. Unknown or empty values receive deterministic type
fallbacks; display names are never used to guess category subjects. Stored strings
only select allowlisted bundled nodes and are never interpreted as HTML or SVG.

Accounts and Templates use the same searchable picker, with financial/category
and action/navigation groups, labelled native buttons, pressed-state feedback,
Tab/Enter/Space and arrow/Home/End navigation. Opening an existing account or
template preserves its stored icon until a choice is made. The existing API
string/null icon validation and PostgreSQL text fields already round-trip both
legacy values and new keys; no schema migration is needed. This repository has
no transaction export/import feature requiring an icon format change. Existing
custom account colors remain stored, but no longer color the account icon boxes.

## Theme entry point

Edit `apps/web/src/styles/theme.css` for all palette values. The existing
`:root` light theme and `[data-theme="dark"]` override are retained. Tokens inherit
through Lit shadow roots. Shared focus, disabled-button and neutral icon-slot
rules live in `apps/web/src/components/calm-styles.ts`.

- Page/surfaces: `--bg-*`; text: `--text-*`; icons: `--icon-color`.
- Borders: `--border-subtle`, `--border-strong`, `--border-control` and
  `--border-focus`.
- Accent: `--color-primary`, hover, subtle, border and text variants, with
  `--on-accent` for filled buttons.
- Status: positive, negative, danger, warning and info roles, independently of
  account types. Filled danger/warning buttons have their own foreground tokens.
- Account badges: asset, liability, settlement, equity, income and expense each
  have separate foreground, background and border properties.
- Chart secondary/tertiary and shadow tokens retain distinct series and surfaces.

Numeric sRGB contrast checks put light account-badge text between 4.88:1 and
5.20:1, and dark badge text above 6:1. Light primary white text is 5.41:1 and
brick-red negative text on the page is 5.27:1. Muted text on the darkest light
neutral surface is 4.63:1; light/dark control borders exceed 3:1 against input
surfaces. These calculations are not a substitute for rendered visual review.

## Verification and manual review

Run `npm run typecheck`, `npm run test -w @penga/web`,
`npm run build -w @penga/web`, and `git diff --check`.
Focused tests cover legacy/key resolution, safe unknown fallback, markup rejection,
picker search/keyboard interaction and preserving/reopening persisted choices.

Browser discovery returned no connected browser during implementation, so no
screenshots or rendered visual checks were performed. Before accepting the visual
finish, check the following in a running local frontend:

1. Visit Dashboard, Accounts, Transactions, Templates, Reconciliation, Budgets
   and Settings in both existing themes. Check badges, signed amounts, warnings,
   errors, selected navigation and chart/ratio legends.
2. In Accounts, inspect nested categories and long names. Open an existing account,
   check its selected legacy icon, search the picker, use Tab/arrow/Home/End and
   Enter/Space, then cancel. Use a disposable account/template to verify saving and
   reopening a selected icon without changing personal financial records.
3. Check hover, keyboard focus and disabled action states, including transaction
   and data-management dialogs. Confirm icon-only controls announce their labels.
4. Repeat at a narrow viewport, checking the existing compact hierarchy, picker
   scrolling, text truncation and modal overflow. This change retains the current
   overall layout and responsive behavior.

No database contents were changed and no deployment was performed.

The refined dark palette uses warm charcoal surfaces, cream text and sage-filled
actions with dark foregrounds. Badge contrast is 6.13:1 or higher, muted text
on the brightest neutral surface is 4.72:1, and primary-button text is 6.62:1.
