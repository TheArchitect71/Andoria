# Andoria — Existential Thinker

Angular frontend for `../Endoria`, with journey questions and personal reflections stored in offline MongoDB.

## Run locally

Use Node 26.10.0 (`.nvmrc`). Follow the offline database setup in [Endoria](https://github.com/TheArchitect71/Endoria), then run its `npm start`. Its API uses localhost:8000 and local MongoDB on port 27018.

In this directory:

```sh
npm ci
npm start
```

Open http://127.0.0.1:4200. Stop each foreground process with Ctrl+C. Both environment files use the local API. Images are bundled, fonts fall back to system fonts, and menu/account/answer controls no longer require cloud icon fonts.

## Checks

```sh
npm run build
npm run typecheck
npm test -- --browsers=ChromeHeadless
```

Set `CHROME_BIN` to a local Chromium executable if necessary. All 32 browser tests pass, including the existing user-written journey-cache, request-isolation, pagination, intersection-observer, and scroll-restoration tests. Test setup now imports real application/Material modules; unrelated generated title assertions were replaced by a navigation-shell check.

Production browser validation covered signup/login, all 31 destination questions without repeated IDs, saving/deleting a reflection, reload/auth restoration, profile/logout, protected routes and desktop/mobile layouts, with external requests blocked. User data was not modified: tests used a separate local database containing copies of the questions.

## Compatibility and preserved behavior

Angular/core/CLI/build 22.2.0, Material/CDK 22.2.1, RxJS 7.8.2, Zone.js 0.16.3. TypeScript 6.0.3 is held by Angular's >=6.0 <6.1 constraint. Jasmine 6.3.0/types 6.0.0 are held because Jasmine 7's read-only globals break Zone.js's Jasmine adapter. Original module/eager change detection and untyped/non-strict code behavior are retained. Current M2 Sass APIs preserve the custom orange/gray theme.

The original password reset method had no backend operation, and the Edit-answer menu item had no handler. These remain unimplemented placeholders; this migration does not claim to make those original placeholders functional. Save/delete reflections and the original authentication flow are validated.

Source backups include the user's untracked documentation before migration. No private database or environment configuration is bundled.
