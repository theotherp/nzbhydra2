package org.nzbhydra.config;

public enum HistoryUserInfoType {
    BOTH,
    IP,
    USERNAME,
    NONE;

    public boolean isLogUserInfo() {
        return this == BOTH || this == USERNAME;
    }
}
