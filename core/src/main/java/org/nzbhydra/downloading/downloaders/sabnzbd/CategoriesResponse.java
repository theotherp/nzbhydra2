package org.nzbhydra.downloading.downloaders.sabnzbd;

import lombok.Data;

import java.util.List;

@Data
public class CategoriesResponse {

    private List<String> categories;

}
