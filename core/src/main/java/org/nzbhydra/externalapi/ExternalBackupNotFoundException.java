package org.nzbhydra.externalapi;

/**
 * Thrown when a backup file name is not among the files the backup folder actually holds. Answered with 404 and a
 * {@code NOT_FOUND} body - unlike the bodyless 404 of a missing API key.
 */
public class ExternalBackupNotFoundException extends RuntimeException {

    public ExternalBackupNotFoundException(String message) {
        super(message);
    }
}
