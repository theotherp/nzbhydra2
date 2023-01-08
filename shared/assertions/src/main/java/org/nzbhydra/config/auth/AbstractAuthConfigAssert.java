package org.nzbhydra.config.auth;

import org.assertj.core.api.AbstractObjectAssert;
import org.assertj.core.internal.Iterables;
import org.assertj.core.util.Objects;

/**
 * Abstract base class for {@link AuthConfig} specific assertions - Generated by CustomAssertionGenerator.
 */
@jakarta.annotation.Generated(value = "assertj-assertions-generator")
public abstract class AbstractAuthConfigAssert<S extends AbstractAuthConfigAssert<S, A>, A extends AuthConfig> extends AbstractObjectAssert<S, A> {

    /**
     * Creates a new <code>{@link AbstractAuthConfigAssert}</code> to make assertions on actual AuthConfig.
     *
     * @param actual the AuthConfig we want to make assertions on.
     */
    protected AbstractAuthConfigAssert(A actual, Class<S> selfType) {
        super(actual, selfType);
    }

    /**
     * Verifies that the actual AuthConfig is allow api stats.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not allow api stats.
     */
    public S isAllowApiStats() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isAllowApiStats()) {
            failWithMessage("\nExpecting that actual AuthConfig is allow api stats but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not allow api stats.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is allow api stats.
     */
    public S isNotAllowApiStats() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isAllowApiStats()) {
            failWithMessage("\nExpecting that actual AuthConfig is not allow api stats but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is auth configured.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not auth configured.
     */
    public S isAuthConfigured() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isAuthConfigured()) {
            failWithMessage("\nExpecting that actual AuthConfig is auth configured but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not auth configured.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is auth configured.
     */
    public S isNotAuthConfigured() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isAuthConfigured()) {
            failWithMessage("\nExpecting that actual AuthConfig is not auth configured but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's authHeader is equal to the given one.
     *
     * @param authHeader the given authHeader to compare the actual AuthConfig's authHeader to.
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig's authHeader is not equal to the given one.
     */
    public S hasAuthHeader(String authHeader) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // overrides the default error message with a more explicit one
        String assertjErrorMessage = "\nExpecting authHeader of:\n  <%s>\nto be:\n  <%s>\nbut was:\n  <%s>";

        // null safe check
        String actualAuthHeader = actual.getAuthHeader();
        if (!Objects.areEqual(actualAuthHeader, authHeader)) {
            failWithMessage(assertjErrorMessage, actual, authHeader, actualAuthHeader);
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's authHeaderIpRanges contains the given String elements.
     *
     * @param authHeaderIpRanges the given elements that should be contained in actual AuthConfig's authHeaderIpRanges.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's authHeaderIpRanges does not contain all given String elements.
     */
    public S hasAuthHeaderIpRanges(String... authHeaderIpRanges) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given String varargs is not null.
        if (authHeaderIpRanges == null) {
            failWithMessage("Expecting authHeaderIpRanges parameter not to be null.");
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContains(info, actual.getAuthHeaderIpRanges(), authHeaderIpRanges);

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's authHeaderIpRanges contains the given String elements in Collection.
     *
     * @param authHeaderIpRanges the given elements that should be contained in actual AuthConfig's authHeaderIpRanges.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's authHeaderIpRanges does not contain all given String elements.
     */
    public S hasAuthHeaderIpRanges(java.util.Collection<? extends String> authHeaderIpRanges) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given String collection is not null.
        if (authHeaderIpRanges == null) {
            failWithMessage("Expecting authHeaderIpRanges parameter not to be null.");
            return myself; // to fool Eclipse "Null pointer access" warning on toArray.
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContains(info, actual.getAuthHeaderIpRanges(), authHeaderIpRanges.toArray());

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's authHeaderIpRanges contains <b>only</b> the given String elements and nothing else in whatever order.
     *
     * @param authHeaderIpRanges the given elements that should be contained in actual AuthConfig's authHeaderIpRanges.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's authHeaderIpRanges does not contain all given String elements.
     */
    public S hasOnlyAuthHeaderIpRanges(String... authHeaderIpRanges) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given String varargs is not null.
        if (authHeaderIpRanges == null) {
            failWithMessage("Expecting authHeaderIpRanges parameter not to be null.");
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContainsOnly(info, actual.getAuthHeaderIpRanges(), authHeaderIpRanges);

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's authHeaderIpRanges contains <b>only</b> the given String elements in Collection and nothing else in whatever order.
     *
     * @param authHeaderIpRanges the given elements that should be contained in actual AuthConfig's authHeaderIpRanges.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's authHeaderIpRanges does not contain all given String elements.
     */
    public S hasOnlyAuthHeaderIpRanges(java.util.Collection<? extends String> authHeaderIpRanges) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given String collection is not null.
        if (authHeaderIpRanges == null) {
            failWithMessage("Expecting authHeaderIpRanges parameter not to be null.");
            return myself; // to fool Eclipse "Null pointer access" warning on toArray.
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContainsOnly(info, actual.getAuthHeaderIpRanges(), authHeaderIpRanges.toArray());

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's authHeaderIpRanges does not contain the given String elements.
     *
     * @param authHeaderIpRanges the given elements that should not be in actual AuthConfig's authHeaderIpRanges.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's authHeaderIpRanges contains any given String elements.
     */
    public S doesNotHaveAuthHeaderIpRanges(String... authHeaderIpRanges) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given String varargs is not null.
        if (authHeaderIpRanges == null) {
            failWithMessage("Expecting authHeaderIpRanges parameter not to be null.");
        }

        // check with standard error message (use overridingErrorMessage before contains to set your own message).
        Iterables.instance().assertDoesNotContain(info, actual.getAuthHeaderIpRanges(), authHeaderIpRanges);

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's authHeaderIpRanges does not contain the given String elements in Collection.
     *
     * @param authHeaderIpRanges the given elements that should not be in actual AuthConfig's authHeaderIpRanges.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's authHeaderIpRanges contains any given String elements.
     */
    public S doesNotHaveAuthHeaderIpRanges(java.util.Collection<? extends String> authHeaderIpRanges) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given String collection is not null.
        if (authHeaderIpRanges == null) {
            failWithMessage("Expecting authHeaderIpRanges parameter not to be null.");
            return myself; // to fool Eclipse "Null pointer access" warning on toArray.
        }

        // check with standard error message (use overridingErrorMessage before contains to set your own message).
        Iterables.instance().assertDoesNotContain(info, actual.getAuthHeaderIpRanges(), authHeaderIpRanges.toArray());

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig has no authHeaderIpRanges.
     *
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's authHeaderIpRanges is not empty.
     */
    public S hasNoAuthHeaderIpRanges() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // we override the default error message with a more explicit one
        String assertjErrorMessage = "\nExpecting :\n  <%s>\nnot to have authHeaderIpRanges but had :\n  <%s>";

        // check
        if (actual.getAuthHeaderIpRanges().iterator().hasNext()) {
            failWithMessage(assertjErrorMessage, actual, actual.getAuthHeaderIpRanges());
        }

        // return the current assertion for method chaining
        return myself;
    }


    /**
     * Verifies that the actual AuthConfig's authType is equal to the given one.
     *
     * @param authType the given authType to compare the actual AuthConfig's authType to.
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig's authType is not equal to the given one.
     */
    public S hasAuthType(AuthType authType) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // overrides the default error message with a more explicit one
        String assertjErrorMessage = "\nExpecting authType of:\n  <%s>\nto be:\n  <%s>\nbut was:\n  <%s>";

        // null safe check
        AuthType actualAuthType = actual.getAuthType();
        if (!Objects.areEqual(actualAuthType, authType)) {
            failWithMessage(assertjErrorMessage, actual, authType, actualAuthType);
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's rememberMeValidityDays is equal to the given one.
     *
     * @param rememberMeValidityDays the given rememberMeValidityDays to compare the actual AuthConfig's rememberMeValidityDays to.
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig's rememberMeValidityDays is not equal to the given one.
     */
    public S hasRememberMeValidityDays(int rememberMeValidityDays) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // overrides the default error message with a more explicit one
        String assertjErrorMessage = "\nExpecting rememberMeValidityDays of:\n  <%s>\nto be:\n  <%s>\nbut was:\n  <%s>";

        // check
        int actualRememberMeValidityDays = actual.getRememberMeValidityDays();
        if (actualRememberMeValidityDays != rememberMeValidityDays) {
            failWithMessage(assertjErrorMessage, actual, rememberMeValidityDays, actualRememberMeValidityDays);
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is remember users.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not remember users.
     */
    public S isRememberUsers() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isRememberUsers()) {
            failWithMessage("\nExpecting that actual AuthConfig is remember users but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not remember users.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is remember users.
     */
    public S isNotRememberUsers() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isRememberUsers()) {
            failWithMessage("\nExpecting that actual AuthConfig is not remember users but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is restrict admin.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not restrict admin.
     */
    public S isRestrictAdmin() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isRestrictAdmin()) {
            failWithMessage("\nExpecting that actual AuthConfig is restrict admin but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not restrict admin.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is restrict admin.
     */
    public S isNotRestrictAdmin() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isRestrictAdmin()) {
            failWithMessage("\nExpecting that actual AuthConfig is not restrict admin but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is restrict details dl.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not restrict details dl.
     */
    public S isRestrictDetailsDl() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isRestrictDetailsDl()) {
            failWithMessage("\nExpecting that actual AuthConfig is restrict details dl but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not restrict details dl.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is restrict details dl.
     */
    public S isNotRestrictDetailsDl() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isRestrictDetailsDl()) {
            failWithMessage("\nExpecting that actual AuthConfig is not restrict details dl but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is restrict indexer selection.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not restrict indexer selection.
     */
    public S isRestrictIndexerSelection() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isRestrictIndexerSelection()) {
            failWithMessage("\nExpecting that actual AuthConfig is restrict indexer selection but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not restrict indexer selection.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is restrict indexer selection.
     */
    public S isNotRestrictIndexerSelection() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isRestrictIndexerSelection()) {
            failWithMessage("\nExpecting that actual AuthConfig is not restrict indexer selection but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is restrict search.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not restrict search.
     */
    public S isRestrictSearch() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isRestrictSearch()) {
            failWithMessage("\nExpecting that actual AuthConfig is restrict search but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not restrict search.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is restrict search.
     */
    public S isNotRestrictSearch() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isRestrictSearch()) {
            failWithMessage("\nExpecting that actual AuthConfig is not restrict search but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is restrict stats.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is not restrict stats.
     */
    public S isRestrictStats() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is true
        if (!actual.isRestrictStats()) {
            failWithMessage("\nExpecting that actual AuthConfig is restrict stats but is not.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig is not restrict stats.
     *
     * @return this assertion object.
     * @throws AssertionError - if the actual AuthConfig is restrict stats.
     */
    public S isNotRestrictStats() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that property call/field access is false
        if (actual.isRestrictStats()) {
            failWithMessage("\nExpecting that actual AuthConfig is not restrict stats but is.");
        }

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's users contains the given UserAuthConfig elements.
     *
     * @param users the given elements that should be contained in actual AuthConfig's users.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's users does not contain all given UserAuthConfig elements.
     */
    public S hasUsers(UserAuthConfig... users) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given UserAuthConfig varargs is not null.
        if (users == null) {
            failWithMessage("Expecting users parameter not to be null.");
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContains(info, actual.getUsers(), users);

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's users contains the given UserAuthConfig elements in Collection.
     *
     * @param users the given elements that should be contained in actual AuthConfig's users.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's users does not contain all given UserAuthConfig elements.
     */
    public S hasUsers(java.util.Collection<? extends UserAuthConfig> users) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given UserAuthConfig collection is not null.
        if (users == null) {
            failWithMessage("Expecting users parameter not to be null.");
            return myself; // to fool Eclipse "Null pointer access" warning on toArray.
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContains(info, actual.getUsers(), users.toArray());

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's users contains <b>only</b> the given UserAuthConfig elements and nothing else in whatever order.
     *
     * @param users the given elements that should be contained in actual AuthConfig's users.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's users does not contain all given UserAuthConfig elements.
     */
    public S hasOnlyUsers(UserAuthConfig... users) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given UserAuthConfig varargs is not null.
        if (users == null) {
            failWithMessage("Expecting users parameter not to be null.");
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContainsOnly(info, actual.getUsers(), users);

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's users contains <b>only</b> the given UserAuthConfig elements in Collection and nothing else in whatever order.
     *
     * @param users the given elements that should be contained in actual AuthConfig's users.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's users does not contain all given UserAuthConfig elements.
     */
    public S hasOnlyUsers(java.util.Collection<? extends UserAuthConfig> users) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given UserAuthConfig collection is not null.
        if (users == null) {
            failWithMessage("Expecting users parameter not to be null.");
            return myself; // to fool Eclipse "Null pointer access" warning on toArray.
        }

        // check with standard error message, to set another message call: info.overridingErrorMessage("my error message");
        Iterables.instance().assertContainsOnly(info, actual.getUsers(), users.toArray());

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's users does not contain the given UserAuthConfig elements.
     *
     * @param users the given elements that should not be in actual AuthConfig's users.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's users contains any given UserAuthConfig elements.
     */
    public S doesNotHaveUsers(UserAuthConfig... users) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given UserAuthConfig varargs is not null.
        if (users == null) {
            failWithMessage("Expecting users parameter not to be null.");
        }

        // check with standard error message (use overridingErrorMessage before contains to set your own message).
        Iterables.instance().assertDoesNotContain(info, actual.getUsers(), users);

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig's users does not contain the given UserAuthConfig elements in Collection.
     *
     * @param users the given elements that should not be in actual AuthConfig's users.
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's users contains any given UserAuthConfig elements.
     */
    public S doesNotHaveUsers(java.util.Collection<? extends UserAuthConfig> users) {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // check that given UserAuthConfig collection is not null.
        if (users == null) {
            failWithMessage("Expecting users parameter not to be null.");
            return myself; // to fool Eclipse "Null pointer access" warning on toArray.
        }

        // check with standard error message (use overridingErrorMessage before contains to set your own message).
        Iterables.instance().assertDoesNotContain(info, actual.getUsers(), users.toArray());

        // return the current assertion for method chaining
        return myself;
    }

    /**
     * Verifies that the actual AuthConfig has no users.
     *
     * @return this assertion object.
     * @throws AssertionError if the actual AuthConfig's users is not empty.
     */
    public S hasNoUsers() {
        // check that actual AuthConfig we want to make assertions on is not null.
        isNotNull();

        // we override the default error message with a more explicit one
        String assertjErrorMessage = "\nExpecting :\n  <%s>\nnot to have users but had :\n  <%s>";

        // check
        if (actual.getUsers().iterator().hasNext()) {
            failWithMessage(assertjErrorMessage, actual, actual.getUsers());
        }

        // return the current assertion for method chaining
        return myself;
    }


}