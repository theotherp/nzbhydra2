package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Scenarios that produce results which the duplicate detection has to deal with.
 */
public final class DuplicateScenarios {

    public static final String SAME_NAMES_QUERY = "samenames";
    public static final String TITLE_DUPLICATES_QUERY = "titleduplicates";
    public static final String ACTUAL_DUPLICATES_QUERY = "actualduplicates";
    public static final String ONE_DUPLICATE_QUERY = "oneduplicate";
    public static final String TITLE_GROUP_QUERY = "titlegroup";

    private DuplicateScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(sameNames(), titleDuplicates(), actualDuplicates(), oneDuplicate(), titleGroup());
    }

    public static Scenario sameNames() {
        return new Scenario("duplicates-samenames",
                "A full page of results whose titles do not contain the indexer, so all indexers return the same titles",
                Match.query(SAME_NAMES_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(IndexerPersona.API_MAX)
                                .titleBase("")
                                .titleWords(Collections.emptyList())
                                .offset(0)
                                .build())
                        .withTotal(1000));
    }

    public static Scenario titleDuplicates() {
        return new Scenario("duplicates-titleduplicates",
                "Ten results with the same titles but different ages per indexer",
                Match.query(TITLE_DUPLICATES_QUERY),
                Respond.items(context -> {
                    List<NewznabXmlItem> items = new ArrayList<>();
                    for (int i = 0; i < 10; i++) {
                        Instant pubDate = Instant.now().minus(i * 100L, ChronoUnit.DAYS).minus("1".equals(context.apikey()) ? 10 : 20, ChronoUnit.DAYS);
                        items.add(NewznabMockBuilder.buildItem(i, "result" + i, pubDate, String.valueOf(1000 * i), "a" + context.random().nextInt(), "b", "5069", "", false, "result" + i));
                    }
                    return items;
                }));
    }

    public static Scenario actualDuplicates() {
        return new Scenario("duplicates-actualduplicates",
                "Ten results that are completely identical",
                Match.query(ACTUAL_DUPLICATES_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(10)
                                .titleBase(ACTUAL_DUPLICATES_QUERY)
                                .titleWords(Collections.emptyList())
                                .offset(context.offset())
                                .total(10)
                                .build())
                        .mutateRoot((context, root) -> {
                            NewznabXmlItem first = root.getRssChannel().getItems().get(0);
                            root.getRssChannel().getItems().forEach(item -> {
                                item.setTitle(first.getTitle());
                                item.setLink(first.getLink());
                                item.setRssGuid(first.getRssGuid());
                                item.setNewznabAttributes(first.getNewznabAttributes());
                            });
                        }));
    }

    public static Scenario oneDuplicate() {
        return new Scenario("duplicates-oneduplicate",
                "One result that every indexer returns identically",
                Match.query(ONE_DUPLICATE_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(1)
                                .titleBase(context.persona().titleBase())
                                .generateOneDuplicate(true)
                                .build())
                        .withTotal(1));
    }

    public static Scenario titleGroup() {
        return new Scenario("duplicates-titlegroup",
                "One result per indexer, all with the title \"titlegroup\"",
                Match.query(TITLE_GROUP_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(1)
                                .titleBase(context.persona().titleBase())
                                .generateOneDuplicate(false)
                                .build())
                        .withTotal(1)
                        .mutateItems((context, item) -> item.setTitle(TITLE_GROUP_QUERY)));
    }

}
