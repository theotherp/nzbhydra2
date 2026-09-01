import type {ServerPreferences} from "../../../services/preferences/serverPreferences";

/**
 * `F-SEARCH-SORT-FILTER`'s last unmigrated gap: legacy's one-time "Sorting of
 * TV episodes" help dialog (`search-results-controller.js:175-191`), keyed by
 * the server-backed `isGroupEpisodesHelpShown` flag (`C-SERVER-PREFERENCES`,
 * per-user, `forUser=true`). Its polarity is inverted relative to FM-079's
 * warning flags: raised here means "already shown", so a raised flag is the
 * one case that must show nothing -- read through `isRaisedFlag`
 * (`serverPreferences.ts`), never legacy's own `!response.data` check, which
 * a client-written `false` (stored back as the string `"false"`) would keep
 * truthy forever.
 */
export const GROUP_EPISODES_HELP_KEY = "isGroupEpisodesHelpShown";

export const GROUP_EPISODES_HELP_TITLE = "Sorting of TV episodes";

/**
 * Legacy's own body text (`search-results-controller.js:186`), with its
 * "upper left" locator dropped -- deliberate deviation, `FEATURES.yaml`
 * F-SEARCH-SORT-FILTER gap line -- since the React layout's "Display
 * options" control isn't fixed to that corner.
 */
export const GROUP_EPISODES_HELP_MESSAGE =
    'When searching in the TV categories results are automatically grouped by episodes. This makes it easier to download one episode each. You can disable this feature any time using the "Display options" button.';

/**
 * The category a search was actually submitted for: its configured name and,
 * when the configuration knows one, its search type. `SearchPage` resolves
 * both from the category catalog for the executed request and threads them
 * here, so eligibility below reads the *searched* category the way legacy did
 * rather than the categories the results happen to carry.
 */
export type SearchedCategory = {
    name: string;
    searchType?: "BOOK" | "MOVIE" | "MUSIC" | "SEARCH" | "TVSEARCH";
};

/**
 * Legacy's predicate (`search-results-controller.js:178`, read from git
 * history -- the AngularJS sources are gone from the working tree):
 *
 * ```js
 * var categoryLower = ($stateParams.category || "").toLowerCase();
 * isGroupEpisodes: $scope.foo.groupEpisodes
 *     && categoryLower.indexOf("tv") > -1
 *     && $stateParams.episode === undefined
 * ```
 *
 * FM-162 restores that source of truth -- the *searched* category, not the
 * returned results' categories -- and widens legacy's name test by one step:
 * a category whose configured `searchType` is `TVSEARCH` counts as a TV
 * category whatever it is named, so the TV categories an installation renamed
 * to "Series" or "Anime" behave like the stock "TV" ones. The name test stays
 * alongside it for a category that is named for TV but left at the default
 * search type.
 */
export function isGroupEpisodesHelpEligible(options: {
    episodeRequested: boolean;
    groupEpisodes: boolean;
    searchedCategory: SearchedCategory | undefined;
}): boolean {
    return (
        options.groupEpisodes &&
        !options.episodeRequested &&
        isTvCategory(options.searchedCategory)
    );
}

function isTvCategory(category: SearchedCategory | undefined): boolean {
    if (!category) {
        return false;
    }
    return (
        category.searchType === "TVSEARCH" ||
        category.name.toLowerCase().includes("tv")
    );
}

/**
 * Reads the flag, shows the dialog only when it is not raised, and writes it
 * only after the dialog closes -- deliberately later than legacy's
 * write-on-open, following FM-079's acknowledge-after-close precedent
 * (`FEATURES.yaml` F-SEARCH-SORT-FILTER gap line), so a dialog the user never
 * actually acknowledged (e.g. a reload mid-display) is shown again next time.
 * A failed read shows nothing and writes nothing. A failed write is not
 * retried and never blocks the caller -- the user has already seen the help,
 * and a session that cannot reach the server for this flag has bigger
 * problems than it reappearing once more.
 */
export async function showGroupEpisodesHelpIfNeeded(context: {
    preferences: ServerPreferences;
    show: () => Promise<void>;
}): Promise<void> {
    let raised: boolean;
    try {
        raised = await context.preferences.readFlag(
            GROUP_EPISODES_HELP_KEY,
            true,
        );
    } catch {
        return;
    }
    if (raised) {
        return;
    }
    await context.show();
    try {
        await context.preferences.write(GROUP_EPISODES_HELP_KEY, true, true);
    } catch {
        // Not retried -- see the doc comment above.
    }
}
