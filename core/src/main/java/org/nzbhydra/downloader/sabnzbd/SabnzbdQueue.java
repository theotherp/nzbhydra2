package org.nzbhydra.downloader.sabnzbd;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class SabnzbdQueue {

    private String status;
    private String speedlimit;
    private String speedlimitAbs;
    private Boolean paused;
    private Integer noofslotsTotal;
    private Integer noofslots;
    private Integer limit;
    private Integer start;
    private String eta;
    private String timeleft;
    private String speed;
    private String kbpersec;
    private String size;
    private String sizeleft;
    private String mb;
    private String mbleft;
    private List<SabnzbdSlot> slots = new ArrayList<>();
    private List<String> categories = new ArrayList<>();
    private List<String> scripts = new ArrayList<>();
    private String diskspace1;
    private String diskspace2;
    private String diskspacetotal1;
    private String diskspacetotal2;
    private String diskspace1Norm;
    private String diskspace2Norm;
    private Boolean ratingEnable;
    private String haveWarnings;
    private String pauseInt;
    private String loadavg;
    private String leftQuota;
    private String refreshRate;
    private String version;
    private Integer finish;
    private String cacheArt;
    private String cacheSize;
    private String cacheMax;
    private Object finishaction;
    private Boolean pausedAll;
    private String quota;
    private Boolean haveQuota;
    private String queueDetails;

}
