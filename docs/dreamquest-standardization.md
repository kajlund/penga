# DreamQuest standardization — Penga

Date: 2026-10-21. Audit and conservative implementation; no dependency upgrades, application logic, schema, API or deployment changes.

References read: `../../Linksmith/docs/dreamquest-conventions.md` and `../../Activus/docs/dreamquest-standardization-audit.md`, including its implementation follow-up (paths relative to this document). Both were available. Repository started clean.

## Initial findings and classification

| Finding                                                                                  | Classification        | Outcome                                                                                                                             |
| ---------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Missing root check; tests used workspace `--if-present`                                  | Standardization       | Added sequential check and explicit selection of all three real suites                                                              |
| No Node declaration or version hint; README claimed v20+                                 | Standardization       | Added Node 24 hint and corrected docs; engines deferred pending actual validation                                                   |
| Global Node/browser globals merged                                                       | Standardization       | Scoped environments to API/tooling, browser source and Node-hosted browser tests                                                    |
| No environment example; only some environment names ignored                              | Standardization       | Added placeholder example; ignore all environment variants except example                                                           |
| No financial input/export/backup/report protection                                       | Standardization       | Added private-directory and common financial/database file ignore rules                                                             |
| README inaccurately described typecheck as no-emit and omitted production/check commands | Application-specific  | Corrected and expanded setup, testing, environment, migration and deployment guidance                                               |
| Shared composite package with ordered TS build                                           | Acceptable difference | Retained project references, exports and emitted typecheck output                                                                   |
| Node test runner, happy-dom component tests, all three suites                            | Acceptable difference | Retained; no Vitest/framework changes or dummy commands                                                                             |
| TypeScript 5 range, Node 22 types, ES2022 NodeNext settings                              | Acceptable difference | Preserved strict settings, decorators and dependency versions; future compiler/type alignment needs deliberate compatibility checks |
| No coverage instrumentation/threshold                                                    | Acceptable difference | Documented existing capability; no invented coverage command                                                                        |
| Tests require compiled code and built web assets                                         | Acceptable difference | Retained full build prerequisite through test/check                                                                                 |
| Database opt-ins can target configured DATABASE_URL                                      | Requires decision     | No DB tests run; require disposable database explicitly before opt-in                                                               |
| Health returns success HTTP status even for DB errors; missing web bundle only warns     | Requires decision     | Documented; production behavior unchanged                                                                                           |
| Environment override precedence and duplicated import-time loading                       | Requires decision     | Documented existing behavior; no configuration refactor                                                                             |
| External deployment archive includes ignored private directories                         | Requires decision     | Documented packaging review; external deployment files unchanged                                                                    |

## Changes implemented

- `package.json`: check runs typecheck, lint, tests with `&&`; test names shared/API/web explicitly so missing scripts fail. Existing build prerequisite retained.
- `.nvmrc`: `24`, selecting the DreamQuest target without pinning a patch or changing system runtime configuration.
- `eslint.config.mjs`: Node globals for API, tests and configuration; browser globals for web source and its Node-hosted DOM tests. Shared library receives neither broad environment.
- `.gitignore`: environment variants, private root directories, CSV/TSV/OFX/QFX/QIF inputs and common database backups, plus verification output. No files deleted; SQL migrations and intentional existing fixtures remain tracked. JSON/PDF/SQL files with arbitrary names elsewhere still need staging review.
- `.prettierignore`: private export/backup/report directories excluded.
- `.env.example`: dedicated development database placeholders, no actual credentials.
- `README.md`: reproducible dev-inclusive install, honest command behavior, disposable DB requirement, build/migration/runtime layout and verified external deployment references.
- This report. Historical `doc/` files preserved.

## Retained differences and dependencies

The single committed npm v3 root lockfile, workspace architecture, runtime Lit/shared dependencies, caret ranges and exact pins remain unchanged. No install, lockfile rewrite, audit fix, override or package upgrade was performed. Root typecheck emits JS/declarations and incremental metadata with `tsc -b`; check therefore emits ignored output. Test additionally builds Vite because static-serving tests need real web assets. This is a necessary existing prerequisite, not formatting or an unrelated build gate. Dev commands and production startup remain unchanged.

## Dependency security

Initial `node --version`, `npm --version`, `npm audit --omit=dev`, `npm audit` and `npm outdated` reported no active Node runtime. After adding the version hint, Node reported `v24.22.0`; npm version, both audits and outdated were blocked by NVM4306: delegated `npm-cli.js` is not trusted.

| Scope                                            | Result                                        |
| ------------------------------------------------ | --------------------------------------------- |
| Production dependencies (`npm audit --omit=dev`) | Unknown; command blocked before npm execution |
| Full tree including development (`npm audit`)    | Unknown; command blocked before npm execution |
| Outdated inventory                               | Unknown; command blocked before npm execution |

No advisory package names, severity counts, vulnerability paths or available fixes could be obtained. This is not a clean security result. Rerun both audits and outdated after trusted runtime repair; record each actual advisory and its dependency path/fix before choosing maintenance. Do not infer Penga's findings from sibling repositories. No registry claims or upstream vulnerability assertions are made here.

## Verification

| Command                         | Result                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `node --version`                | v24.22.0 after `.nvmrc`                                                                          |
| `npm --version`                 | NVM4306                                                                                          |
| `npm run typecheck`             | NVM4306 before script execution                                                                  |
| `npm run lint`                  | NVM4306 before script execution                                                                  |
| `npm test`                      | NVM4306 before script execution                                                                  |
| `npm run check`                 | NVM4306 before script execution                                                                  |
| `npm run format:check`          | NVM4306 before script execution                                                                  |
| `npm run build`                 | NVM4306 before script execution                                                                  |
| Production/full audit, outdated | NVM4306 on retry                                                                                 |
| `git diff --check`              | Passed                                                                                           |
| `git check-ignore`              | Private environment/data/export/backup/report examples ignored; `.env.example` remains trackable |

The existing environment problem prevented all npm validation, so there is no new passing test count, formatting result or proven Node compatibility. No trust controls were bypassed or altered. No production database, integration suite, migrations, imports, seed, server, deployment or clean dependency install was executed. Actual local `.env` contents and personal financial records were not inspected. Static inspection covered manifests, scripts, configs, lockfile metadata, test guards, startup/environment/migration code and external deployment configuration. This is not a comprehensive historical secret scan or a live-server audit.

## Decisions and manual attention before deployment

1. Repair the trusted local npm installation outside this task, then rerun the listed commands with all database opt-in flags unset. `.nvmrc` is a target hint, not proof; add matching root/lockfile `engines.node: 24.x` only after compatibility checks succeed. No unverified engine claim was added.
2. Review actual production/development audit findings and select dependency fixes separately; upgrades were explicitly out of scope.
3. Confirm the live service and environment, Node runtime, retained workspace links and shared/API/web artifacts, database backup and compiled migration procedure in staging. Source migration uses dev-only tsx. Never run seed automatically.
4. External `../../deploy.ps1` (relative to repository root) archives the working directory, runs npm ci/build in staging, prunes devDependencies and activates/restarts with rollback. `../../deploy.apps.json` names Penga service, paths and health URL documented in README. Confirm devDependencies are installed in the build shell. Git ignores do not prevent private local files from entering this archive; review exclusions before deploying such a checkout.
5. Decide separately whether health semantics, missing-web readiness, environment precedence and stronger DB-test safeguards warrant production behavior changes.

## Reusable notes

Inventory actual test prerequisites before separating build/check: Penga's compiled imports and static assets justify a build prerequisite. Explicitly list real test workspaces rather than silently skipping absent scripts. Keep browser globals scoped while retaining Node globals for DOM test harnesses. Distinguish a selected runtime from tested compatibility and blocked audits from clean audits. Private-data Git ignores and deployment-archive exclusions are independent controls. Preserve migration metadata and compiled shared packages during production pruning.
