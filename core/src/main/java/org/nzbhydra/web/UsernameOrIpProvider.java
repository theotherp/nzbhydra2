package org.nzbhydra.web;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.HistoryUserInfoType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;

@Component
public class UsernameOrIpProvider {

    @Autowired
    private ConfigProvider configProvider;

    public String getUsernameOrIpInternal(HttpServletRequest request) {
        String usernameOrIp = null;
        if (configProvider.getBaseConfig().getMain().getLogging().getHistoryUserInfoType() == HistoryUserInfoType.IP) {
            usernameOrIp = request.getRemoteAddr();
        } else if (configProvider.getBaseConfig().getMain().getLogging().getHistoryUserInfoType() == HistoryUserInfoType.USERNAME) {
            usernameOrIp = request.getRemoteUser();
        }
        return usernameOrIp;
    }

    public String getUsernameOrIpExternal(HttpServletRequest request) {
        String usernameOrIp = null;
        if (configProvider.getBaseConfig().getMain().getLogging().getHistoryUserInfoType() == HistoryUserInfoType.IP) {
            usernameOrIp = request.getRemoteAddr();
        }
        return usernameOrIp;
    }
}
