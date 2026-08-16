import {expect, type Locator, type Page} from "@playwright/test";

export const visualViewports = {
    desktop: {width: 1280, height: 800},
    mobile: {width: 390, height: 844},
} as const;

export type VisualViewport = keyof typeof visualViewports;

export interface VisualGeometryCheck {
    region: string;
    locator: Locator;
    minimumWidth?: number;
    maximumWidth?: number;
}

function stableRegionName(region: string): string {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(region)) {
        throw new Error(`Visual evidence region must be kebab-case: ${region}`);
    }
    return region;
}

export function visualEvidencePath(featureId: string, region: string): string {
    if (!/^F-[A-Z0-9-]+$/.test(featureId)) {
        throw new Error(`Visual evidence feature ID is invalid: ${featureId}`);
    }
    // Deliberately outside `test-results/` (Playwright's `outputDir`, which
    // Playwright clears at the start of every run): durable, per-feature
    // visual evidence must survive being overwritten by a run for a
    // different feature, not just the current one.
    return `visual-evidence/${featureId}/${stableRegionName(region)}.png`;
}

export async function prepareVisualEvidence(
    page: Page,
    viewport: VisualViewport,
    setup: () => Promise<void>,
): Promise<void> {
    await page.setViewportSize(visualViewports[viewport]);
    await page.emulateMedia({reducedMotion: "reduce"});
    await setup();
    await page.addStyleTag({
        content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
    });
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
}

export async function expectVisualGeometry(
    page: Page,
    check: VisualGeometryCheck,
): Promise<void> {
    stableRegionName(check.region);
    await expect(check.locator).toBeVisible();
    const box = await check.locator.boundingBox();
    expect(box, `${check.region} must have a bounding box`).not.toBeNull();
    if (!box) {
        return;
    }
    if (check.minimumWidth !== undefined) {
        expect(box.width, `${check.region} minimum width`).toBeGreaterThanOrEqual(
            check.minimumWidth,
        );
    }
    if (check.maximumWidth !== undefined) {
        expect(box.width, `${check.region} maximum width`).toBeLessThanOrEqual(
            check.maximumWidth,
        );
    }
    expect(
        await check.locator.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
        ),
        `${check.region} must not overflow horizontally`,
    ).toBe(true);
    expect(
        await page.locator("html").evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
        ),
        "page must not overflow horizontally",
    ).toBe(true);
}

export async function captureVisualRegion(
    locator: Locator,
    featureId: string,
    region: string,
): Promise<string> {
    const path = visualEvidencePath(featureId, region);
    await locator.screenshot({path});
    return path;
}
