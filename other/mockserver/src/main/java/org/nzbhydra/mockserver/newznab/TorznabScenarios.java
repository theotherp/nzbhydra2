package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * The scenarios of the torznab endpoint. Caps requests are answered by the controller.
 */
public final class TorznabScenarios {

    private TorznabScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(deterministicTorrentFile(), deterministicMagnet(), torznabDefault());
    }

    public static Scenario deterministicTorrentFile() {
        return new Scenario("torznab-deterministic-file",
                "One stable result linking to a torrent file, used by the torrent handling system test",
                Match.query(DeterministicFixtures.DETERMINISTIC_TORRENT_FILE_QUERY),
                deterministicResponse(DeterministicFixtures.DETERMINISTIC_TORRENT_TITLE, "deterministic-file-guid", true));
    }

    public static Scenario deterministicMagnet() {
        return new Scenario("torznab-deterministic-magnet",
                "One stable result linking to a magnet URI, used by the torrent handling system test",
                Match.query(DeterministicFixtures.DETERMINISTIC_MAGNET_QUERY),
                deterministicResponse(DeterministicFixtures.DETERMINISTIC_MAGNET_TITLE, "deterministic-magnet-guid", false));
    }

    private static RootBehaviour deterministicResponse(String title, String guid, boolean torrentFile) {
        return Respond.items(context -> {
            String link = torrentFile ? context.hostUrl() + "/torrent/deterministic-file" : DeterministicFixtures.DETERMINISTIC_MAGNET_URI;
            NewznabXmlItem item = new NewznabXmlItem();
            item.setTitle(title);
            item.setLink(link);
            item.setPubDate(Instant.parse("2026-01-01T00:00:00Z"));
            item.setDescription("Deterministic torrent fixture");
            item.setComments(context.hostUrl() + "/details/" + guid);
            item.setCategory("5000");
            item.setRssGuid(new NewznabXmlGuid(guid, true));
            item.setEnclosure(new NewznabXmlEnclosure(link, 12345L, "application/x-bittorrent"));
            item.setNewznabAttributes(new ArrayList<>(Collections.singletonList(new NewznabAttribute("category", "5000"))));
            item.setTorznabAttributes(new ArrayList<>(Arrays.asList(
                    new NewznabAttribute("guid", guid),
                    new NewznabAttribute("seeders", "42"),
                    new NewznabAttribute("peers", "7"),
                    new NewznabAttribute("size", "12345")
            )));
            return Collections.singletonList(item);
        }).mutateRoot((context, root) -> root.getRssChannel().setNewznabResponse(null));
    }

    public static Scenario torznabDefault() {
        return new Scenario("torznab-default",
                "A full page of generated torrent results",
                Match.always(),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(IndexerPersona.API_MAX)
                                .titleBase(titleBase(context))
                                .titleWords(Collections.emptyList())
                                .torznab(true)
                                .offset(0)
                                .build())
                        .torznab());
    }

    private static String titleBase(MockContext context) {
        if (DuplicateScenarios.SAME_NAMES_QUERY.equals(context.query())) {
            return "";
        }
        return PagingScenarios.titleBaseWithCategory(context);
    }

}
