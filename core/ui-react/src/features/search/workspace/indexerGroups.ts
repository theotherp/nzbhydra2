import type {SearchIndexer} from "../../../domain/categories/catalog";

/** The names of every group at least one eligible indexer belongs to. */
export function indexerGroupNames(eligibleIndexers: SearchIndexer[]): string[] {
    return [
        ...new Set(eligibleIndexers.flatMap((indexer) => indexer.groupNames)),
    ].sort();
}

/** The eligible indexers selecting `group` selects, in catalog order. */
export function indexerGroupMembers(
    eligibleIndexers: SearchIndexer[],
    group: string,
): string[] {
    return eligibleIndexers
        .filter((indexer) => indexer.groupNames.includes(group))
        .map((indexer) => indexer.name);
}
