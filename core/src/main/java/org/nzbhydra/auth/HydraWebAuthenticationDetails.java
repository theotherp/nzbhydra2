package org.nzbhydra.auth;

import com.google.common.base.Objects;
import org.springframework.security.web.authentication.WebAuthenticationDetails;

import javax.servlet.http.HttpServletRequest;

public class HydraWebAuthenticationDetails extends WebAuthenticationDetails {

    private final String filteredIp;


    /**
     * Records the remote address and will also set the session Id if a session already
     * exists (it won't create one).
     *
     * @param request that the authentication request was received from
     */
    public HydraWebAuthenticationDetails(HttpServletRequest request) {
        super(request);
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip != null) {
            ip = ip.split(",")[0];
        } else {
            ip = request.getRemoteAddr();
        }
        this.filteredIp = ip;
    }

    public String getFilteredIp() {
        return filteredIp;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof HydraWebAuthenticationDetails)) {
            return false;
        }
        if (!super.equals(o)) {
            return false;
        }
        HydraWebAuthenticationDetails that = (HydraWebAuthenticationDetails) o;
        return Objects.equal(filteredIp, that.filteredIp);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(super.hashCode(), filteredIp);
    }
}
