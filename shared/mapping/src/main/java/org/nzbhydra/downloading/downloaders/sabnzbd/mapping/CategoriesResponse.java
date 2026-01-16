

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@Data
@ReflectionMarker
public class CategoriesResponse {

    private List<String> categories;

}
