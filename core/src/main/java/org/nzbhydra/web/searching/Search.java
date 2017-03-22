package org.nzbhydra.web.searching;

import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.web.searching.mapping.IndexerSearch;
import org.nzbhydra.web.searching.mapping.SearchResponse;
import org.nzbhydra.web.searching.mapping.SearchResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
public class Search {

    @Autowired
    private Searcher searcher;
    @Autowired
    private CategoryProvider categoryProvider;

    Random random = new Random();

    @RequestMapping(value = "/internalapi/search", produces = "application/json")
    public SearchResponse search(@RequestParam(value = "query", required = false) String query,
                                 @RequestParam(value = "offset", required = false) Integer offset,
                                 @RequestParam(value = "limit", required = false) Integer limit,
                                 @RequestParam(value = "minsize", required = false) Integer minsize,
                                 @RequestParam(value = "maxsize", required = false) Integer maxsize,
                                 @RequestParam(value = "minage", required = false) Integer minage,
                                 @RequestParam(value = "maxage", required = false) Integer maxage,
                                 @RequestParam(value = "loadAll", required = false) Boolean loadAll,
                                 @RequestParam(value = "category", required = false) String category
    ) {
        SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery(query);
        searchRequest.setLimit(limit);
        searchRequest.setOffset(offset);
        searchRequest.setMinage(minage);
        searchRequest.setMaxage(maxage);
        searchRequest.setMinsize(minsize);
        searchRequest.setMaxsize(maxsize);
        searchRequest.setSearchType(SearchType.SEARCH);
        searchRequest.getInternalData().setLoadAll(loadAll == null ? false : loadAll);
        searchRequest.setCategory(categoryProvider.getByName(category));

        org.nzbhydra.searching.SearchResult searchResult = searcher.search(searchRequest);
        List<SearchResult> transformedSearchResults = new ArrayList<>();
        List<TreeSet<SearchResultItem>> duplicateGroups = searchResult.getDuplicateDetectionResult().getDuplicateGroups();
        for (TreeSet<SearchResultItem> duplicateGroup : duplicateGroups) {
            int groupResultsIdentifier = random.nextInt();
            for (SearchResultItem item : duplicateGroup) {
                SearchResult result = new SearchResult();
                result.setHash(groupResultsIdentifier);
                result.setTitle(item.getTitle());
                result.setAge("todo");
                result.setDetails_link(item.getDetails());
                result.setCategory("todo");
                result.setIndexer(item.getIndexer().getName());
                result.setSearchResultId(item.getSearchResultId());
                transformedSearchResults.add(result);
            }

        }


        SearchResponse response = new SearchResponse();
        response.setRejected(Collections.emptyList());

        IndexerSearch indexerSearch = new IndexerSearch();
        indexerSearch.setIndexer("newznab1");
        response.setIndexersearches(Collections.singletonList(indexerSearch));

        response.setResults(transformedSearchResults);

        return response;
    }
}
