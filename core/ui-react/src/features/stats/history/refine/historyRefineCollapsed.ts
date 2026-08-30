import {useState} from "react";

import {readItem, writeItem} from "../../../../domain/storage/browserStorage";

/**
 * ADR-0046: one key for all three history views. Search, download, and
 * notification history are one refine concept to the user, so collapsing the
 * docked column on one of them keeps it collapsed on the others -- and across
 * a reload, which is the same code path here: each view reads this preference
 * when its surface mounts, and a route change unmounts one view and mounts
 * the next.
 *
 * The results page keeps its own `hydra.search-results.table` blob; nothing
 * here reads or writes it. This closes the storage-key candidate the old
 * horizontal bar left open (`MAINTENANCE.md`'s entry was discharged by FM-087).
 */
const COLLAPSED_KEY = "hydra.history.refine";

// Written as words rather than "true"/"false" so a stored value stays legible
// in devtools next to the other `hydra.*` preferences, and so anything that is
// neither is unambiguously garbage.
const COLLAPSED = "collapsed";
const EXPANDED = "expanded";

/**
 * The stored preference, defaulting to expanded when it is absent, unreadable,
 * or not one of the two values this module writes -- a garbage payload is a
 * preference nobody expressed, and the column starts open.
 *
 * Only the *docked* column's collapsed state is persisted. The sub-768px
 * drawer's open state deliberately is not: a desktop user whose column is
 * expanded must not have an overlay popped over the content when the same
 * preference is read on a phone (the rationale `C-REFINE-SURFACE` records for
 * keeping the two booleans separate in the first place).
 */
function loadCollapsed(): boolean {
    return readItem(COLLAPSED_KEY) === COLLAPSED;
}

/**
 * The docked refine column's collapsed state for a history view, read once per
 * mount and written back on every toggle.
 */
export function useHistoryRefineCollapsed(): [boolean, () => void] {
    const [collapsed, setCollapsed] = useState(loadCollapsed);
    // The write happens here rather than inside the state updater or an
    // effect: a `useState` updater must stay pure (React invokes it twice
    // under StrictMode), and an effect would also fire on the first render,
    // persisting a preference the user never expressed.
    const toggle = () => {
        const next = !collapsed;
        writeItem(COLLAPSED_KEY, next ? COLLAPSED : EXPANDED);
        setCollapsed(next);
    };
    return [collapsed, toggle];
}
