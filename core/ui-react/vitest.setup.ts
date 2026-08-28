import "@testing-library/jest-dom/vitest";

import {cleanup} from "@testing-library/react";
import {afterEach} from "vitest";

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
afterEach(() => {
    cleanup();
});
