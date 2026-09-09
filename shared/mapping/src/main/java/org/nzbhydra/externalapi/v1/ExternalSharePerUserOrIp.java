package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * A user's or IP's share of all searches or downloads. The key is the user name or the IP.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "A user's or IP's share of all searches or downloads")
public class ExternalSharePerUserOrIp {

    @Schema(description = "The user name or the IP address")
    private String key;

    @Schema(description = "Number of searches or downloads made by it")
    private Integer count;

    @Schema(description = "Percentage of all searches or downloads it accounts for")
    private float percentage;
}
