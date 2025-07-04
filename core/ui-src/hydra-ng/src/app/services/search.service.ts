import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";

export interface SearchRequestParameters {
    query?: string;
    offset?: number;
    limit?: number;
    minsize?: number;
    maxsize?: number;
    minage?: number;
    maxage?: number;
    loadAll?: boolean;
    category?: string;
    mode?: string;
    indexers?: string[];
    title?: string;
    imdbId?: string;
    tmdbId?: string;
    tvrageId?: string;
    tvdbId?: string;
    tvmazeId?: string;
    season?: number;
    episode?: string;
    searchRequestId: number;
}

export interface SearchResponse {
    indexerSearchMetaDatas: IndexerSearchMetaData[];
    rejectedReasonsMap: { [key: string]: number };
    notPickedIndexersWithReason: { [key: string]: string };
    searchResults: SearchResultWebTO[];
    numberOfAvailableResults: number;
    numberOfAcceptedResults: number;
    numberOfRejectedResults: number;
    numberOfProcessedResults: number;
    numberOfDuplicateResults: number;
    offset: number;
    limit: number;
}

export interface IndexerSearchMetaData {
    didSearch: boolean;
    errorMessage?: string;
    hasMoreResults: boolean;
    indexerName: string;
    notPickedReason?: string;
    numberOfAvailableResults: number;
    numberOfFoundResults: number;
    offset: number;
    responseTime: number;
    totalResultsKnown: boolean;
    wasSuccessful: boolean;
}

export interface SearchResultWebTO {
    searchResultId: string;
    title: string;
    link: string;
    guid: string;
    hash: string;
    detailsLink: string;
    publishDate: string;
    category: string;
    size: number;
    files: number;
    grabs: number;
    comments: number;
    password: boolean;
    usenetDate: string;
    age: number;
    indexer: string;
    downloadType: string;
    downloadUrl: string;
    nzbDownloadUrl: string;
    torrentDownloadUrl: string;
}

@Injectable({
    providedIn: "root"
})
export class SearchService {

    constructor(private http: HttpClient) {
    }

    search(parameters: SearchRequestParameters): Observable<SearchResponse> {
        return this.http.post<SearchResponse>("/internalapi/search", parameters);
    }

    shortcutSearch(searchRequestId: number): Observable<void> {
        return this.http.post<void>(`/internalapi/shortcutSearch/${searchRequestId}`, {});
    }
} 