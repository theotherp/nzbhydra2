package org.nzbhydra.fortests;

import lombok.Builder;
import lombok.Data;
import lombok.Singular;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@Data
@ReflectionMarker
@Builder
public class NewznabResponseData {

    private Integer offset;
    private Integer total;
    @Singular
    private List<NewznabItemData> newznabItems;

}
