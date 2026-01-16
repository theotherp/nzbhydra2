

package org.nzbhydra;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
class HydraPage<T> {

    private List<T> content;
    private boolean last;
    private int totalPages;
    private int totalElements;
    private int size;
    private boolean first;
    private boolean empty;

}
