

package org.nzbhydra.externaltools;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
public class AddDialogInfo {

    private boolean usenetIndexersConfigured;
    private boolean torrentIndexersConfigured;
    private String nzbhydraHost;
    private boolean prioritiesConfigured;


}
