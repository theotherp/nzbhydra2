package org.nzbhydra.mockserver.newznab;

import com.google.common.collect.Lists;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;

/**
 * Scenarios that exercise offset, limit and total handling.
 */
public final class PagingScenarios {

    public static final String OFFSET_TEST_QUERY = "offsettest";
    public static final String OFFSET_TEST_2_QUERY = "offsettest2";
    public static final String DOGNZB_TOTAL_TEST_QUERY = "dognzbtotaltest";
    public static final String DOGNZB_DISABLING_SYSTEM_PROPERTY = "nomockdognzb";
    public static final String SHOW_QUERY_PREFIX = "show";
    public static final String BLUB_QUERY_PREFIX = "blub";
    public static final String PAGING_QUERY = "paging";

    private PagingScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(offsetTest(), offsetTest2(), dognzbTotalTest(), show(), blub(), paging(), pagingWithTotal());
    }

    public static Scenario offsetTest() {
        return new Scenario("paging-offsettest",
                "40 results in pages of ten, an empty response beyond the last page",
                Match.query(OFFSET_TEST_QUERY),
                (RootBehaviour) context -> {
                    if (context.offset() >= 40) {
                        //Deliberately bare: the original returned a root without channel metadata here
                        NewznabXmlRoot root = new NewznabXmlRoot();
                        root.getRssChannel().setNewznabResponse(new NewznabXmlResponse(0, 0));
                        return root;
                    }
                    int start = context.offset();
                    int end = Math.min(start + 10 - 1, 40);
                    NewznabXmlRoot root = NewznabMockBuilder.generateResponse(NewznabMockRequest.builder()
                            .numberOfResults(end - start)
                            .titleBase("offsetTest")
                            .generateDuplicates(context.generateDuplicates())
                            .titleWords(Collections.emptyList())
                            .offset(0)
                            .build());
                    root.getRssChannel().getNewznabResponse().setTotal(40);
                    return root;
                });
    }

    public static Scenario offsetTest2() {
        return new Scenario("paging-offsettest2",
                "A full page of results at the requested offset, claiming 300 results",
                Match.query(OFFSET_TEST_2_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                        .numberOfResults(IndexerPersona.API_MAX)
                        .titleBase(OFFSET_TEST_QUERY)
                        .offset(context.offset())
                        .titleWords(Collections.emptyList())
                        .total(300)
                        .build()));
    }

    public static Scenario dognzbTotalTest() {
        return new Scenario("paging-dognzbtotaltest",
                "Mimics dognzb's total handling, unless the system property " + DOGNZB_DISABLING_SYSTEM_PROPERTY + " is set",
                Match.all(Match.query(DOGNZB_TOTAL_TEST_QUERY), Match.systemPropertyAbsent(DOGNZB_DISABLING_SYSTEM_PROPERTY)),
                (RootBehaviour) context -> {
                    if (context.offset() >= 300) {
                        return Respond.empty().buildRoot(context);
                    }
                    NewznabXmlRoot root = NewznabMockBuilder.generateResponse(NewznabMockRequest.builder()
                            .numberOfResults(IndexerPersona.API_MAX)
                            .titleBase(DOGNZB_TOTAL_TEST_QUERY)
                            .offset(context.offset())
                            .titleWords(Collections.emptyList())
                            .total(300)
                            .build());
                    root.getRssChannel().getNewznabResponse().setTotal(IndexerPersona.API_MAX);
                    return root;
                });
    }

    public static Scenario show() {
        return new Scenario("paging-show",
                "\"show<n>\" returns n results in total, starting at the requested offset",
                Match.queryStartsWith(SHOW_QUERY_PREFIX),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(requestedResults(context) - context.offset())
                                .titleBase(context.apikey())
                                .generateDuplicates(context.generateDuplicates())
                                .titleWords(Collections.emptyList())
                                .offset(context.offset())
                                .build())
                        .withTotal(PagingScenarios::requestedResults));
    }

    private static int requestedResults(MockContext context) {
        return Integer.parseInt(context.query().substring(SHOW_QUERY_PREFIX.length()));
    }

    public static Scenario blub() {
        return new Scenario("paging-blub",
                "A full page of results whose titles contain query, API key and category",
                Match.queryStartsWith(BLUB_QUERY_PREFIX),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(IndexerPersona.API_MAX - context.offset())
                                .titleBase(titleBaseWithCategory(context))
                                .generateDuplicates(context.generateDuplicates())
                                .titleWords(Collections.emptyList())
                                .offset(context.offset())
                                .build())
                        .withTotal(IndexerPersona.API_MAX));
    }

    /**
     * Also used by the torznab default, which builds its title base the same way.
     */
    static String titleBaseWithCategory(MockContext context) {
        String titleBase = context.query() + "_" + context.apikey();
        if (!context.params().getCat().isEmpty()) {
            titleBase += context.params().getCat().get(0);
        }
        return titleBase;
    }

    public static Scenario paging() {
        return new Scenario("paging-plain",
                "300 results whose publication dates are spread over days, <API key> results per day",
                Match.queryEqualsIgnoreCase(PAGING_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(IndexerPersona.API_MAX)
                                .titleBase(context.apikey())
                                .generateDuplicates(context.generateDuplicates())
                                .titleWords(Collections.emptyList())
                                .offset(context.offset())
                                .build())
                        .withTotal(IndexerPersona.API_MAX)
                        .mutateRoot(PagingScenarios::spreadPubDatesOverDays)
                        //Unreachable by construction (the query must equal "paging" to get here), kept from the original
                        .withStatus(context -> context.query() != null && context.query().contains("error") && "100".equals(context.apikey())
                                ? HttpStatus.NOT_FOUND
                                : HttpStatus.OK));
    }

    private static void spreadPubDatesOverDays(MockContext context, NewznabXmlRoot root) {
        if (context.query() == null || !context.query().startsWith(PAGING_QUERY)) {
            //"PAGING" and friends only get the results, not the date distribution
            return;
        }
        List<NewznabXmlItem> items = root.getRssChannel().getItems();
        int resultsPerDay = Integer.parseInt(context.apikey());
        List<List<NewznabXmlItem>> partitions = Lists.partition(items, resultsPerDay);
        for (int i = 0; i < partitions.size(); i++) {
            for (NewznabXmlItem item : partitions.get(i)) {
                int daysToSubtract = i;
                if (context.offset() > 0) {
                    daysToSubtract += context.offset() / resultsPerDay;
                }
                item.setPubDate(Instant.now().minus(daysToSubtract, ChronoUnit.DAYS));
            }
        }
        for (int i = 0; i < items.size(); i++) {
            NewznabXmlItem item = items.get(i);
            item.setPubDate(item.getPubDate().minus(i, ChronoUnit.MINUTES));
        }
        root.getRssChannel().getNewznabResponse().setTotal(300);
    }

    public static Scenario pagingWithTotal() {
        return new Scenario("paging-with-total",
                "\"paging<n>\" returns one page at the requested offset and claims n results",
                Match.all(Match.queryStartsWith(PAGING_QUERY), Match.not(Match.queryEqualsIgnoreCase(PAGING_QUERY))),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(context.limit())
                                .titleBase(context.apikey())
                                .generateDuplicates(context.generateDuplicates())
                                .titleWords(Collections.emptyList())
                                .offset(context.offset())
                                .build())
                        .withTotal(context -> Integer.parseInt(context.query().substring(PAGING_QUERY.length()))));
    }

}
