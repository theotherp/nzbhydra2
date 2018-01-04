package org.nzbhydra.downloading;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.searching.SearchResultWebTO;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddNzbsRequest {

    private String downloaderName;
    private List<SearchResultWebTO> searchResults = new ArrayList<>();
    private String category;

}
