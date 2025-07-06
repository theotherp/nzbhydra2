package org.nzbhydra.downloading;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
public class AddFilesRequest {

    private String downloaderName;
    private List<SearchResult> searchResults = new ArrayList<>();
    private String category;

    @Data
@ReflectionMarker
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchResult {
        @JsonSerialize(using = ToStringSerializer.class)
        private Long searchResultId;
        private String originalCategory;
        private String mappedCategory;

    }

}
