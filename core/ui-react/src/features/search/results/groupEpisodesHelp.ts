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
 * Legacy's predicate (`search-results-controller.js:178`): the group-episodes
 * display option on, the searched category containing "tv" case-insensitively,
 * and no specific episode already requested. Legacy read the category off
 * `$stateParams`; the React results view is only handed the results
 * themselves, so this checks the returned results' own categories instead --
 * deliberate deviation, `FEATURES.yaml` F-SEARCH-SORT-FILTER gap line.
 */
export function isGroupEpisodesHelpEligible(options: {
    categories: readonly string[];
    episodeRequested: boolean;
    groupEpisodes: boolean;
}): boolean {
    return (
        options.groupEpisodes &&
        !options.episodeRequested &&
        options.categories.some((category) =>
            category.toLowerCase().includes("tv"),
        )
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
