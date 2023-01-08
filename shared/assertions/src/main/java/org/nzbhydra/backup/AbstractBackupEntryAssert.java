package org.nzbhydra.backup;

import org.assertj.core.api.AbstractObjectAssert;
import org.assertj.core.util.Objects;

/**
 * Abstract base class for {@link BackupEntry} specific assertions - Generated by CustomAssertionGenerator.
 */
@jakarta.annotation.Generated(value = "assertj-assertions-generator")
public abstract class AbstractBackupEntryAssert<S extends AbstractBackupEntryAssert<S, A>, A extends BackupEntry> extends AbstractObjectAssert<S, A> {

    /**
     * Creates a new <code>{@link AbstractBackupEntryAssert}</code> to make assertions on actual BackupEntry.
     *
     * @param actual the BackupEntry we want to make assertions on.
     */
    protected AbstractBackupEntryAssert(A actual, Class<S> selfType) {
        super(actual, selfType);
    }

    /**
     * Verifies that the actual BackupEntry's creationDate is equal to the given one.
     *
     * @param creationDate the given creationDate to compare the actual BackupEntry's creationDate to.
     * @return this assertion object.
     * @throws AssertionError - if the actual BackupEntry's creationDate is not equal to the given one.
     */
    public S hasCreationDate(java.time.Instant creationDate) {
        // check that actual BackupEntry we want to make assertions on is not null.
        isNotNull();

        // overrides the default error message with a more explicit one
        String assertjErrorMessage = "\nExpecting creationDate of:\n  <%s>\nto be:\n  <%s>\nbut was:\n  <%s>";

        // null safe check
        java.time.Instant actualCreationDate = actual.getCreationDate();
        if (!Objects.areEqual(actualCreationDate, creationDate)) {
            failWithMessage(assertjErrorMessage, actual, creationDate, actualCreationDate);
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual BackupEntry's filename is equal to the given one.
     *
     * @param filename the given filename to compare the actual BackupEntry's filename to.
     * @return this assertion object.
     * @throws AssertionError - if the actual BackupEntry's filename is not equal to the given one.
     */
    public S hasFilename(String filename) {
        // check that actual BackupEntry we want to make assertions on is not null.
        isNotNull();

        // overrides the default error message with a more explicit one
        String assertjErrorMessage = "\nExpecting filename of:\n  <%s>\nto be:\n  <%s>\nbut was:\n  <%s>";

        // null safe check
        String actualFilename = actual.getFilename();
        if (!Objects.areEqual(actualFilename, filename)) {
            failWithMessage(assertjErrorMessage, actual, filename, actualFilename);
        }

        // return the current assertion for method chaining
        return myself;
    }

}