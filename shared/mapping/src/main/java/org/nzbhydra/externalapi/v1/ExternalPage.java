package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

/**
 * One page of a paged answer. Deliberately not Spring's {@code Page}, whose JSON shape is an implementation detail.
 *
 * @param <T> the entry type of the route that returns this page
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "One page of a paged answer")
public class ExternalPage<T> {

    @Schema(description = "The page that was returned, 1 based", example = "1")
    private int page;

    @Schema(description = "How many entries a page holds at most", example = "100")
    private int limit;

    @Schema(description = "How many entries match the filter in total, over all pages", example = "2")
    private long totalElements;

    @Schema(description = "How many pages the filter yields at the current limit", example = "1")
    private int totalPages;

    @Schema(description = "The entries of this page")
    private List<T> entries;
}
