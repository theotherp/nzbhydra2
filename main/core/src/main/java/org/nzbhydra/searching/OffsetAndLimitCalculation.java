package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OffsetAndLimitCalculation {

    private int offset;
    private int limit;

}
