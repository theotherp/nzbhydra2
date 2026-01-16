

package org.nzbhydra.web;

import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@ReflectionMarker
public record ApiError(String status, Instant timestamp, String message) {

}
