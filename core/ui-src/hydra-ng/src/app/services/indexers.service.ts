import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {ConfigService} from "./config.service";

export interface Indexer {
    name: string;
    preselect: boolean;
    categories: string[];
    showOnSearch: boolean;
    enabledForSearchSource: string;
    searchModuleType: string;
    color?: string;
    vipExpirationDate?: string;
}

export interface IndexerWithState extends Indexer {
    activated: boolean;
}

@Injectable({
    providedIn: "root"
})
export class IndexersService {

    constructor(private configService: ConfigService) {
    }

    getIndexers(): Observable<Indexer[]> {
        return this.configService.getIndexers();
    }

    getAvailableIndexers(categoryName: string, previouslySelectedIndexers: string[] = []): Observable<IndexerWithState[]> {
        return this.getIndexers().pipe(
            map(indexers => {
                return indexers
                    .filter(indexer => indexer.showOnSearch)
                    .filter(indexer => {
                        // Filter by category - show all if category is "All" or if indexer has no category restrictions
                        return !indexer.categories ||
                            indexer.categories.length === 0 ||
                            categoryName.toLowerCase() === "all" ||
                            indexer.categories.includes(categoryName);
                    })
                    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                    .map(indexer => ({
                        ...indexer,
                        activated: this.isIndexerPreselected(indexer, previouslySelectedIndexers)
                    }));
            })
        );
    }

    private isIndexerPreselected(indexer: Indexer, previouslySelectedIndexers: string[]): boolean {
        if (previouslySelectedIndexers.length === 0) {
            return indexer.preselect;
        } else {
            return previouslySelectedIndexers.includes(indexer.name);
        }
    }

    getSelectedIndexers(indexers: IndexerWithState[]): string[] {
        return indexers
            .filter(indexer => indexer.activated)
            .map(indexer => indexer.name);
    }
} 