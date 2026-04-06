package org.nzbhydra.downloading;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateMovieDownloadCheckResponse {

    private boolean reasonRequired;
}
