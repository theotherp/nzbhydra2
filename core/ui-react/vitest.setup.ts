import "@testing-library/jest-dom/vitest";

import {cleanup} from "@testing-library/react";
import {afterEach, beforeEach, vi} from "vitest";

import {
    resetBrowserStubs,
    stubWorkingLocalStorage,
} from "./src/test/browserStubs";

// This jsdom environment has no `window.localStorage` (opaque origin), so a
// working store used to be copy-pasted into ten test files, each with its own
// teardown. Installing it here gives every test a fresh, empty store and
// leaves only the deviations -- a blocked store, a throwing accessor, no store
// at all -- for a test file to state explicitly (see `src/test/browserStubs.ts`).
beforeEach(() => {
    stubWorkingLocalStorage();
});

// Class-wide guard (FM-122): unmount every rendered tree after each test, in
// every test file, so any pending React effect cleanup -- timers, listeners,
// MUI FocusTrap's 50ms focus-loss polling interval, react-transition-group's
// enter/exit timeout -- runs synchronously now, while this file's jsdom
// environment is still alive, instead of firing later against a torn-down
// environment. Left unmounted (e.g. a dialog abandoned mid-transition), that
// pending work eventually calls into a react-dom scheduler callback that
// throws "ReferenceError: window is not defined" once jsdom has removed the
// global `window` binding for this test file. `cleanup()` is idempotent, so
// this is safe alongside any test file's own `afterEach(cleanup)`.
// See MAINTENANCE.md's DialogProvider.test.tsx teardown-race entry.
//
// The rest of the teardown is the class-wide half of the same problem: a stub
// a test file forgot to remove was visible to the next file's tests, which is
// one of the ways this suite failed intermittently. `vi.unstubAllGlobals()`
// removes every `vi.stubGlobal` (localStorage, matchMedia, fetch, navigator,
// URL, scrollTo...); `resetBrowserStubs()` removes what `Object.defineProperty`
// installed, which `unstubAllGlobals` does not know about. `restoreAllMocks()`
// rather than `clearAllMocks()`: since Vitest 3 it restores only spies created
// with `vi.spyOn` and leaves `vi.fn()` implementations alone, so module-level
// `vi.mock` factories (`getStatsMock`, the `DownloadActions` wrapper) keep
// working, which `clearAllMocks` would also do but without undoing a spy an
// individual test left installed on a real object.
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    resetBrowserStubs();
    vi.restoreAllMocks();
});
