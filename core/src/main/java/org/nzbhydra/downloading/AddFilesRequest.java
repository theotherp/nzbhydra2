package org.nzbhydra.downloading;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddFilesRequest {

    private String downloaderName;
    private List<SearchResult> searchResults = new ArrayList<>();
    private String category;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchResult {

        private String searchResultId;
        private String originalCategory;

    }

}
