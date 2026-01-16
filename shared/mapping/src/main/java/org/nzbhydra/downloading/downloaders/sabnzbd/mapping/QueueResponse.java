

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class QueueResponse {

    private Queue queue;

}
