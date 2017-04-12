package org.nzbhydra.fortests;

import lombok.Builder;
import lombok.Data;
import lombok.Singular;

import java.util.List;

@Data
@Builder
public class NewznabResponseData {

    private Integer offset;
    private Integer total;
    @Singular
    private List<NewznabItemData> newznabItems;

}
