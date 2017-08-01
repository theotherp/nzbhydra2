package org.nzbhydra.downloading.sabnzbd;

import lombok.Data;

@Data
public class SabnzbdSlot {

    private String status;
    private Integer index;
    private String password;
    private Integer missing;
    private String avgAge;
    private String script;
    private Boolean hasRating;
    private String mb;
    private String mbleft;
    private String size;
    private String sizeleft;
    private String filename;
    private String priority;
    private String cat;
    private String eta;
    private String timeleft;
    private String percentage;
    private String nzoId;
    private String unpackopts;

}
