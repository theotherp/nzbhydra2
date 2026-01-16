

package org.nzbhydra.mapping.nzbindex;

import lombok.Data;
import org.nzbhydra.mapping.IndexerResponseTypeHolder;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;
import java.util.Map;

@Data
@ReflectionMarker
public class NzbIndexRoot implements IndexerResponseTypeHolder {

    @Override
    public ResponseType getType() {
        return ResponseType.JSON;
    }

    private Stats stats;
    private List<Result> results;


    @Data
    @ReflectionMarker
    public static class Stats {
        private String query;
        private boolean query_poster;
        private int total;
        private int count;
        private int per_page;
        private int current_page;
        private int max_page;
        private boolean has_previous_page;
        private boolean has_next_page;
        private Long time;
        private int page_start;
        private int page_end;
    }

    @Data
    @ReflectionMarker
    public static class Result {
        private long id;
        private String name;
        private String poster;
        private Long posted;
        private boolean spam;
        private boolean password;
        private int file_count;
        private int group_count;
        private Long size;
        private int total_parts;
        private int available_parts;
        private boolean complete;
        private List<String> group_names;
        private List<Integer> group_ids;
        private Map<String, Integer> file_types;
        private List<ResultFile> files;
    }

    @Data
    @ReflectionMarker
    public static class ResultFile {
        private long id;
        private String name;
        private long posted;
        private long size;
        private int totalParts;
        private int availableParts;
        private boolean complete;
    }

}
