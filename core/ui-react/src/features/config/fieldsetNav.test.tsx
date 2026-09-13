import {act, cleanup, render, screen} from "@testing-library/react";
import {useEffect, useId, useRef} from "react";
import {afterEach, describe, expect, it} from "vitest";

import {
    fieldsetNavAnchorTestId,
    NO_FIELDSET_NAV_REGISTRY,
    useFieldsetNav,
    type FieldsetNavRegistry,
} from "./fieldsetNav";

afterEach(() => {
    cleanup();
});

/** A fake `ConfigFieldset`: registers a `<div>` under `label` for as long as it is mounted. */
function Registrant({
    label,
    registry,
}: {
    label: string;
    registry: FieldsetNavRegistry;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const id = useId();
    useEffect(() => {
        if (ref.current === null) {
            return undefined;
        }
        return registry.register(id, label, ref.current);
    }, [registry, id, label]);
    return <div data-testid={`fake-${label}`} ref={ref} />;
}

function Harness({showB}: {showB: boolean}) {
    const {entries, registry} = useFieldsetNav();
    return (
        <div>
            <Registrant label="A" registry={registry} />
            {showB ? <Registrant label="B" registry={registry} /> : null}
            <Registrant label="C" registry={registry} />
            <span data-testid="order">
                {entries.map((entry) => entry.label).join(",")}
            </span>
        </div>
    );
}

describe("useFieldsetNav", () => {
    it("should register mounted fieldsets in DOM order", () => {
        render(<Harness showB />);

        expect(screen.getByTestId("order")).toHaveTextContent("A,B,C");
    });

    it("should order a conditionally mounted fieldset by where it sits in the DOM, not by when it registered", () => {
        const {rerender} = render(<Harness showB={false} />);
        expect(screen.getByTestId("order")).toHaveTextContent("A,C");

        // B mounts after A and C are already registered -- its effect commits
        // last -- but it sits between them in the JSX, so a registration-order
        // list would wrongly append it after C. Deriving order from the live
        // DOM tree on every change gets its real position instead.
        act(() => {
            rerender(<Harness showB />);
        });
        expect(screen.getByTestId("order")).toHaveTextContent("A,B,C");
    });

    it("should withdraw a fieldset's entry when it unmounts", () => {
        const {rerender} = render(<Harness showB />);
        expect(screen.getByTestId("order")).toHaveTextContent("A,B,C");

        act(() => {
            rerender(<Harness showB={false} />);
        });
        expect(screen.getByTestId("order")).toHaveTextContent("A,C");
    });
});

describe("NO_FIELDSET_NAV_REGISTRY", () => {
    it("should accept a registration inertly, for a fieldset rendered outside ConfigShell", () => {
        const unregister = NO_FIELDSET_NAV_REGISTRY.register(
            "id",
            "Hosting",
            document.createElement("div"),
        );
        expect(() => unregister()).not.toThrow();
    });
});

describe("fieldsetNavAnchorTestId", () => {
    it("should lowercase the label into the anchor's own testid prefix", () => {
        expect(fieldsetNavAnchorTestId("Logging")).toBe(
            "config-nav-anchor-logging",
        );
    });
});
