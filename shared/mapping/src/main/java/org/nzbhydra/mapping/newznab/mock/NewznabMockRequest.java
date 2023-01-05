package org.nzbhydra.mapping.newznab.mock;

import lombok.Builder;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@Builder
public class NewznabMockRequest {

    private int offset;
    private int total;
    private String titleBase;
    private String indexer;
    private int numberOfResults;
    private boolean generateDuplicates;
    private boolean generateOneDuplicate;
    private String newznabCategory;
    private boolean torznab;
    @Builder.Default
    private List<String> titleWords = new ArrayList<>();


}
