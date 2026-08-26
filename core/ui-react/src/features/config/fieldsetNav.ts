import {createContext, useCallback, useContext, useMemo, useState} from "react";

/**
 * `F-CONFIG-SHELL` / `C-CONFIG-FIELDS`: the "on this page" list ADR-0028
 * requires below the nav's `Tabs`. A `ConfigFieldset` registers its DOM node
 * here while mounted rather than the nav walking the tab body's element tree
 * itself, because the active tab is rendered through `<Outlet />` — a route
 * component the nav has no reference into — and because a conditionally
 * rendered or advanced-hidden fieldset (FM-098) must simply not be in the map
 * rather than needing to be filtered back out by some per-tab table that could
 * drift from what actually mounted.
 *
 * One registry lives in `ConfigShell`, which is the only place both halves —
 * the tab body doing the registering and `ConfigNav` doing the rendering — are
 * both reachable from. Its state is a plain object per instance rather than
 * memoized identity of anything, so a mount or unmount always produces a new
 * `entries` array `ConfigNav` re-renders from.
 */
export type FieldsetNavEntry = {
    /** Stable per mounted `ConfigFieldset` instance (`useId()`), not the label. */
    id: string;
    /** The fieldset's legend, reused verbatim as the anchor's accessible name. */
    label: string;
    /**
     * The DOM node scrolling and scrollspy act on: always the fieldset's own
     * `<fieldset>` element, registered for exactly as long as that element is
     * on the page. A whole advanced fieldset still collapsed behind its
     * expander (FM-098) has no such element and therefore no entry here — the
     * list holds only fieldsets there is actually something to jump to, and
     * scrollspy never has to special-case a node that is not laid out.
     * `ConfigFieldset.tsx` carries the mechanics of keeping the two in step.
     */
    node: HTMLElement;
};

export type FieldsetNavRegistry = {
    /**
     * Registers one fieldset. Returns the function that withdraws it, called
     * from the same `useEffect`'s cleanup so registration follows mount order
     * exactly the way FM-098's advanced-row count does.
     */
    register: (id: string, label: string, node: HTMLElement) => () => void;
};

const NOOP_UNREGISTER = () => {};

/**
 * What a `ConfigFieldset` sees when it is not inside `ConfigShell` — a
 * focused component test, say. Registering here is inert, matching the
 * documented boundary `NO_ADVANCED_DISCLOSURE` draws for the same case.
 */
export const NO_FIELDSET_NAV_REGISTRY: FieldsetNavRegistry = {
    register: () => NOOP_UNREGISTER,
};

export const FieldsetNavContext = createContext<FieldsetNavRegistry>(
    NO_FIELDSET_NAV_REGISTRY,
);

export function useFieldsetNavRegistry(): FieldsetNavRegistry {
    return useContext(FieldsetNavContext);
}

/**
 * `ConfigShell`'s half: owns the registered set for whichever tab is mounted
 * and derives the "on this page" order from it.
 *
 * Registration order is mount order, not document order — React runs an
 * effect for each sibling in the order it committed, but a conditionally
 * rendered fieldset (a `useWatch`-gated section, an advanced fieldset revealed
 * after the tab painted) commits *later* than fieldsets already on screen
 * while sitting *earlier* in the tab's JSX. Trusting registration sequence
 * would therefore leave such a fieldset stuck at the end of the list forever.
 * `orderByDomPosition` re-derives the order from the live tree on every
 * registration change instead, so the list is always current-DOM-order
 * regardless of when each fieldset happened to mount.
 */
export function useFieldsetNav(): {
    entries: readonly FieldsetNavEntry[];
    registry: FieldsetNavRegistry;
} {
    const [registered, setRegistered] = useState<
        ReadonlyMap<string, {label: string; node: HTMLElement}>
    >(new Map());

    const register = useCallback(
        (id: string, label: string, node: HTMLElement) => {
            setRegistered((current) => {
                const next = new Map(current);
                next.set(id, {label, node});
                return next;
            });
            return () => {
                setRegistered((current) => {
                    if (!current.has(id)) {
                        return current;
                    }
                    const next = new Map(current);
                    next.delete(id);
                    return next;
                });
            };
        },
        [],
    );

    const registry = useMemo<FieldsetNavRegistry>(
        () => ({register}),
        [register],
    );
    const entries = useMemo(() => orderByDomPosition(registered), [registered]);

    return {entries, registry};
}

function orderByDomPosition(
    registered: ReadonlyMap<string, {label: string; node: HTMLElement}>,
): readonly FieldsetNavEntry[] {
    return [...registered.entries()]
        .sort(([, a], [, b]) => {
            if (a.node === b.node) {
                return 0;
            }
            const position = a.node.compareDocumentPosition(b.node);
            if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
                return -1;
            }
            if ((position & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
                return 1;
            }
            return 0;
        })
        .map(([id, {label, node}]) => ({id, label, node}));
}

/**
 * The anchor's test id, `config-nav-anchor-<fieldset testid suffix>` per
 * Acceptance — the same lowercased-label suffix `fieldsetTestId` uses, kept as
 * a separate literal here rather than imported so this module (read by
 * `ConfigNav.tsx`) has no dependency on `components/settings.ts` (read by
 * `ConfigFieldset.tsx`). Deliberately not `config-fieldset-*`: an anchor's
 * accessible name duplicates its fieldset's legend, and a shared prefix would
 * let a role/text locator in a per-tab spec match both.
 */
export function fieldsetNavAnchorTestId(label: string): string {
    return `config-nav-anchor-${label.toLowerCase()}`;
}
