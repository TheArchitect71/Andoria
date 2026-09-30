# Question scrolling and navigation restoration

The question list now loads more cards as you approach its bottom. Leaving a journey and returning through browser Back, its home-screen card, or the answer-save redirect restores that journey's loaded cards and scroll position. This cache lasts for the current running page; a full browser refresh starts a new cache.

## Why the previous list lost its place

The previous component replaced `questions` with each five-question response. On route entry it cleared both the cards and the cursor. Navigating to an answer destroyed that component, so returning created a fresh first page. Router window-scroll restoration would not fix this alone: this app's viewport-sized Material sidenav makes `mat-sidenav-content` the scrolling element. In browser verification, `window.scrollY` was zero while that element's `scrollTop` was 500.

## Follow the data through the source

1. **Select a journey.** [`ListComponent`](../src/app/questions/list/list.component.ts) subscribes to the journey's state in [`QuestionsService`](../src/app/questions/questions.service.ts). The root-provided service survives routed component destruction. Its cache key is the normalized journey filter, so Destination and Humanitarian keep separate cards, cursors, and offsets. Equivalent filter orderings share one cache. Existing encoded `?journeys=destination` paths still work.
2. **Watch the bottom.** The template's `loadTrigger` element sits after the cards. `IntersectionObserver` uses the Material scroll container as its root and starts loading within 200 pixels of the bottom. A layout check after each response also fills a viewport taller than one page. Browsers without this API get a manual load-more button.
3. **Ask once.** `loadMoreJourneyQuestions` returns immediately if that journey already has a request running or has reached its end. `HttpParams` encodes the filters and page size. The first request omits `lastId`; later requests use the saved cursor.
4. **Append safely.** A successful response appends new IDs instead of replacing existing cards. Duplicate IDs are removed, and `trackQuestion` lets Angular retain existing card elements. Each request captures its own cache entry, so a late Destination response cannot overwrite the currently displayed Humanitarian journey.
5. **Stop or retry.** Endoria's `has_more` decides whether another page exists. The last partial page stays visible. For an older backend without that field, a short/empty page is the fallback end signal. A failed request keeps the previous cards and cursor, clears the loading indicator, and shows an explicit retry. Automatic observation pauses while an error is displayed. A cursor that does not advance is treated as a failure rather than causing a request loop.

The answer link also carries its origin journey in a query parameter. [`AnswerComponent`](../src/app/questions/answer/answer.component.ts) passes that value back on save, so returning to an older answer in browser history still returns to its original journey even if another journey was visited in between.

## Why restoration waits for rendering

At `NavigationStart`, the list saves the container's offset **before** Angular removes its tall content. Saving only after removal can capture a clamped offset of zero. On return, the service's `BehaviorSubject` immediately supplies its cached cards. Two queued animation frames give Angular's template update and browser layout a turn before `scrollTop` is assigned. Assigning it against a short, empty list would clamp the requested position again. Observations are gated during this restoration and navigation; subscriptions, the observer, and queued frames are cleaned up when the list is destroyed.

The journey overview also saves its own offset in `NavigationComponent`. Both screens share one physical scroll container, but their saved positions are separate: returning from questions at either the top or the bottom restores where the journey was originally selected.

The navigation sequence is: save offset → leave list → resubscribe to cached state → render cards → restore offset → resume automatic loading.

## Dependencies and reproduction

A dependency upgrade is **not required for this fix**. The installed Angular/CLI 9.1.13 and RxJS 6.6.7 already provide the service, observable, routing, and lifecycle APIs used here. `IntersectionObserver` and animation frames are browser APIs. The application build and regression suite pass with these installed dependencies. The missing spinner-module import was added to `QuestionsModule` using the already installed Material package.

Node 22 still needs the existing OpenSSL compatibility flag for this Angular/Webpack toolchain. A broader framework/toolchain migration can be planned separately; it is not the cause of the replaced cards or lost scroll state. Package files were not changed for this scrolling fix.

Keep the development server in the visible terminal:

```sh
NODE_OPTIONS=--openssl-legacy-provider npm start
```

Stop it with Ctrl+C. To build once without launching another server:

```sh
NODE_OPTIONS=--openssl-legacy-provider npm run build -- --output-path=/private/tmp/andoria-infinite-build --progress=false
```

Run the focused regressions with Chrome/Chromium installed (set `CHROME_BIN` if its executable is not in the launcher's standard locations):

```sh
NODE_OPTIONS=--openssl-legacy-provider npm test -- --watch=false --browsers=ChromeHeadless --ts-config=src/tsconfig.questions-spec.json --include=src/app/questions/questions.service.spec.ts --include=src/app/questions/list/list.component.spec.ts --include=src/app/app-shell/navigation/navigation.component.spec.ts --progress=false
```

The focused configuration isolates these regressions from unrelated original application-template specs that still reference a nonexistent `Portfolio` title.

## Verification and source references

Service tests cover append/deduplication, concurrent requests, cache replay, separate filters, late responses, retry, partial/full final pages, the older response contract, a non-advancing cursor, and answer-return origin. Component tests cover delayed restoration on the actual scroll container, capture before removal, route reuse, stale subscriptions, observation gates, and retry. Overview tests cover returning from questions at the top or bottom, first entry, and saving before teardown.

Browser verification exercised automatic loading through all 31 Destination questions, Back restoration with 20 loaded cards at offset 500 and no refetch, independent journey positions, a delayed response after switching journeys, and a failed next page followed by retry. Desktop and mobile views were checked. Journey requests used the live API. Answer detail/save requests used isolated browser fixtures; authenticated backend persistence was not tested.

Concept references:

- [Angular component lifecycle](https://angular.dev/guide/components/lifecycle): initialization and destruction timing. This fix uses the lifecycle hooks available in Angular 9, not newer render-hook APIs shown elsewhere in that guide.
- [RxJS BehaviorSubject](https://rxjs.dev/api/index/class/BehaviorSubject): the state stream used for immediate cache replay.
- [MDN Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API): observing a sentinel relative to a scrolling ancestor.
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame): scheduling layout-dependent work around browser rendering.
