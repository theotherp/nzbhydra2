package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * One query that shows every kind of grouping the results table can do, in as few results as possible.
 *
 * <p>Search for {@value #GROUPING_QUERY} -- or anything starting with it, including the two scenario ids -- with
 * every mock indexer enabled. Each newznab indexer answers with five
 * results and each torznab indexer with two, so two newznab indexers plus one torznab indexer give twelve results
 * holding:</p>
 *
 * <ul>
 *     <li><em>a duplicate group</em>: {@code Grouping.Duplicate.Movie...}, returned byte for byte identically by every
 *     newznab indexer -- same size, same age, same poster and group, which is what
 *     {@code DuplicateDetector.testForSameness} needs. Torrents are deliberately not part of it: the detector refuses
 *     any pair involving one;</li>
 *     <li><em>a title group</em>: {@code Grouping.Title.Movie...}, once per indexer with a different spelling
 *     (dots against spaces, so the grouping's normalisation is visible), and with sizes, ages, posters and groups far
 *     enough apart that these are <em>not</em> duplicates. The torznab result joins this group only while "Group
 *     torrent and Usenet results" is on;</li>
 *     <li><em>an episode group</em>: {@code Grouping.Show} S02E03, one differently named release per indexer, all
 *     carrying the same showtitle/season/episode attributes, plus a torrent one for the same episode;</li>
 *     <li><em>a second episode of that same season</em> (S02E04), which forms its own group -- episodes group per
 *     episode, not per season;</li>
 *     <li><em>an ungrouped result</em> per indexer, whose title carries the indexer's own api key so nothing can ever
 *     group it.</li>
 * </ul>
 *
 * <p>Switching the three grouping display options then shows each mechanism in isolation: with "Group TV episodes" off
 * the S02E03 releases fall apart into their differing titles, with "Group same titles" off only the duplicate group
 * survives, and "Group torrent and Usenet results" decides whether the two torrent results join the title and episode
 * groups or stand beside them.</p>
 */
public final class GroupingScenarios {

    public static final String GROUPING_QUERY = "grouping";

    private static final String MOVIES_HD_CATEGORY = "2040";
    private static final String TV_HD_CATEGORY = "5040";
    private static final String SHOW_TITLE = "Grouping Show";

    //Anchored to the hour so that repeating the search does not shift the ages by a few seconds each time
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.HOURS);

    private GroupingScenarios() {
    }

    public static Scenario newznab() {
        return new Scenario("grouping-newznab",
                "Five results per indexer showing a duplicate group, a title group and two episode groups at once",
                //Any query starting with "grouping" so that searching for the scenario id, which is what
                ///mock/scenarios lists, hits the scenario instead of falling through to the hundreds of generated
                //results of the default one
                Match.queryStartsWithIgnoreCase(GROUPING_QUERY),
                Respond.items(context -> {
                    String apikey = context.apikey() == null ? "" : context.apikey();
                    //Stable per indexer, and only used for the cosmetic differences between the group's members
                    int variant = Math.abs(apikey.hashCode()) % 2;
                    List<NewznabXmlItem> items = new ArrayList<>();
                    items.add(duplicate());
                    items.add(titleGroupMember(apikey, variant));
                    items.add(episode(apikey, variant, "3", "1080p.WEB-DL"));
                    items.add(episode(apikey, variant, "4", "720p.HDTV"));
                    items.add(ungrouped(apikey));
                    return items;
                }));
    }

    public static Scenario torznab() {
        return new Scenario("grouping-torznab",
                "The torrent halves of the title group and of the S02E03 episode group",
                //Any query starting with "grouping" so that searching for the scenario id, which is what
                ///mock/scenarios lists, hits the scenario instead of falling through to the hundreds of generated
                //results of the default one
                Match.queryStartsWithIgnoreCase(GROUPING_QUERY),
                Respond.items(context -> {
                    List<NewznabXmlItem> items = new ArrayList<>();
                    //Same normalised title as the newznab members, so it joins their title group once torrent and
                    //Usenet results may share one
                    NewznabXmlItem titleMember = item(20, "Grouping Title Movie 2026 2160p WEB-DL",
                            NOW.minus(96, ChronoUnit.HOURS), "7500000000", "torrent-title@example.com",
                            "alt.binaries.torrent", MOVIES_HD_CATEGORY, true);
                    items.add(titleMember);
                    NewznabXmlItem episodeMember = item(21, "Grouping.Show.S02E03.2160p.WEB-DL-TORRENT",
                            NOW.minus(50, ChronoUnit.HOURS), "4500000000", "torrent-episode@example.com",
                            "alt.binaries.torrent", TV_HD_CATEGORY, true);
                    addEpisodeAttributes(episodeMember, "3");
                    items.add(episodeMember);
                    return items;
                }));
    }

    /**
     * Identical for every indexer, which is what makes the duplicate detection group these into one bucket.
     */
    private static NewznabXmlItem duplicate() {
        return item(10, "Grouping.Duplicate.Movie.2026.1080p.BluRay-HYDRA",
                NOW.minus(24, ChronoUnit.HOURS), "3000000000", "duplicate@example.com", "alt.binaries.duplicate",
                MOVIES_HD_CATEGORY, false);
    }

    /**
     * The same title for every indexer, but never a duplicate of the other indexers' copies: the group attribute
     * alone already rules that out, and size and age are far outside both thresholds as well.
     */
    private static NewznabXmlItem titleGroupMember(String apikey, int variant) {
        String title = variant == 0
                ? "Grouping.Title.Movie.2026.2160p.WEB-DL"
                : "Grouping Title Movie 2026 2160p WEB-DL";
        return item(11, title, NOW.minus(48L + variant * 72L, ChronoUnit.HOURS),
                variant == 0 ? "5000000000" : "9000000000",
                "title-" + apikey + "@example.com", "alt.binaries." + apikey, MOVIES_HD_CATEGORY, false);
    }

    /**
     * Differently named releases of one episode, so only the showtitle/season/episode attributes can group them.
     */
    private static NewznabXmlItem episode(String apikey, int variant, String episode, String quality) {
        NewznabXmlItem item = item(Integer.parseInt(episode) + 100,
                "Grouping.Show.S02E0" + episode + "." + quality + "-" + (variant == 0 ? "GRPA" : "GRPB"),
                NOW.minus(Integer.parseInt(episode) * 12L + variant * 6L, ChronoUnit.HOURS),
                variant == 0 ? "2000000000" : "2600000000",
                "episode-" + apikey + "@example.com", "alt.binaries." + apikey, TV_HD_CATEGORY, false);
        addEpisodeAttributes(item, episode);
        return item;
    }

    /**
     * Carries the indexer's api key in its title, so no other indexer's result can share a title group with it.
     */
    private static NewznabXmlItem ungrouped(String apikey) {
        return item(12, "Grouping.Standalone." + apikey + ".2026.720p.WEB",
                NOW.minus(200, ChronoUnit.HOURS), "700000000", "standalone-" + apikey + "@example.com",
                "alt.binaries." + apikey, MOVIES_HD_CATEGORY, false);
    }

    private static void addEpisodeAttributes(NewznabXmlItem item, String episode) {
        item.getNewznabAttributes().add(new NewznabAttribute("showtitle", SHOW_TITLE));
        item.getNewznabAttributes().add(new NewznabAttribute("season", "2"));
        item.getNewznabAttributes().add(new NewznabAttribute("episode", episode));
    }

    private static NewznabXmlItem item(int counter, String title, Instant pubDate, String size, String poster,
                                       String group, String newznabCategory, boolean torznab) {
        return NewznabMockBuilder.buildItem(counter, title, pubDate, size, poster, group, newznabCategory,
                GROUPING_QUERY, torznab, title);
    }

}
