

package org.nzbhydra.api;

import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.OutputType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class MockSearch {

    @Autowired
    private NewznabXmlTransformer newznabXmlTransformer;
    @Autowired
    private NewznabJsonTransformer newznabJsonTransformer;

    public NewznabResponse mockSearch(NewznabParameters params, boolean isNzb) {
        final List<SearchResultItem> searchResultItems = new ArrayList<>();
        final SearchResultItem item = new SearchResultItem();
        item.setTitle("Mocked result");
        item.setIndexerGuid("mockedResult");
        item.setIndexerScore(1);
        item.setLink("http://127.0.0.1");
        item.setOriginalCategory("Mock");
        item.setCategory(CategoryProvider.naCategory);
        item.setPubDate(Instant.now());
        item.setSize(10000L);
        searchResultItems.add(item);
        NewznabResponse response;
        if (params.getO() == OutputType.JSON) {
            response = newznabJsonTransformer.transformToRoot(searchResultItems, 0, 1, isNzb);
        } else {
            response = newznabXmlTransformer.getRssRoot(searchResultItems, 0, 1, isNzb);
        }

        return response;
    }

}
