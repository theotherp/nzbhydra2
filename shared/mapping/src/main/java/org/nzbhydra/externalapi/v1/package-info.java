/**
 * The contract classes of the external API v1 ({@code /externalapi/v1}).
 *
 * <p>They live in the {@code mapping} module so that consumers - the system tests among them - can deserialise them
 * without depending on {@code core}. Nothing in here may expose a JPA entity, a Spring {@code Page}, the internal
 * {@code FilterModel}/{@code SortModel} or the {@code StatsRequest}/{@code StatsResponse} pair: those are free to
 * change, these are not. The mapping from the internal types is explicit (see {@code org.nzbhydra.externalapi} in
 * core), so a rename inside an internal class breaks compilation rather than the contract.
 *
 * <p>Field order is the serialisation order. Instants are serialised as ISO-8601 strings in UTC.
 */
package org.nzbhydra.externalapi.v1;
