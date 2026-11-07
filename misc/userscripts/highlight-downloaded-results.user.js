// ==UserScript==
// @name         NZBHydra2: highlight downloaded results
// @namespace    https://github.com/theotherp/nzbhydra2
// @version      1.0
// @description  Colors the whole row of a search result that was already downloaded.
// @match        http://127.0.0.1:5076/*
// @match        http://localhost:5076/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Add an @match line for the URL you open NZBHydra2 at if it isn't one of the above.

(function () {
    "use strict";

    // Semi-transparent so it works with the light and the dark theme.
    const ROW_COLOR = "rgba(46, 160, 67, 0.18)";
    const MARK = "data-userscript-downloaded";

    const style = document.createElement("style");
    style.textContent = `
        tr[data-testid="search-result-row"][${MARK}] > td {
            background-color: ${ROW_COLOR} !important;
        }
    `;
    document.head.appendChild(style);

    // A downloaded result has a chip labelled "Downloaded" in its row. Quality
    // badges are green chips too, so match the label text, not the color.
    function isDownloaded(row) {
        for (const label of row.querySelectorAll(".MuiChip-label")) {
            if (label.textContent.trim() === "Downloaded") {
                return true;
            }
        }
        return false;
    }

    function markRows() {
        for (const row of document.querySelectorAll('tr[data-testid="search-result-row"]')) {
            // Rows are reused while scrolling, so remove the mark as well as setting it.
            row.toggleAttribute(MARK, isDownloaded(row));
        }
    }

    let scheduled = false;
    new MutationObserver(() => {
        if (scheduled) {
            return;
        }
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            markRows();
        });
    }).observe(document.body, {childList: true, subtree: true, characterData: true});

    markRows();
})();
