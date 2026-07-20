package org.nzbhydra.downloading;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public record DownloadIdentifier(long searchResultId, Integer searchId) {

    private static final Pattern PATTERN = Pattern.compile("(-?\\d+)(?:\\.(\\d+))?");

    public static DownloadIdentifier parse(String value, boolean internal) throws InvalidSearchResultIdException {
        if (value == null) {
            throw new InvalidSearchResultIdException("null", internal);
        }
        Matcher matcher = PATTERN.matcher(value);
        if (!matcher.matches()) {
            throw new InvalidSearchResultIdException(value, internal);
        }
        try {
            return new DownloadIdentifier(Long.parseLong(matcher.group(1)), matcher.group(2) == null ? null : Integer.valueOf(matcher.group(2)));
        } catch (NumberFormatException e) {
            throw new InvalidSearchResultIdException(value, internal);
        }
    }

    @Override
    public String toString() {
        return searchId == null ? String.valueOf(searchResultId) : searchResultId + "." + searchId;
    }
}
