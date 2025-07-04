import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";

export interface MediaInfo {
    imdbId?: string;
    tmdbId?: string;
    tvmazeId?: string;
    tvrageId?: string;
    tvdbId?: string;
    title?: string;
    year?: number;
    posterUrl?: string;
    label?: string; // For display in autocomplete
}

export type AutocompleteType = "TV" | "MOVIE";

@Injectable({
    providedIn: "root"
})
export class MediaInfoService {

    constructor(private http: HttpClient) {
    }

    getAutocomplete(type: AutocompleteType, input: string): Observable<MediaInfo[]> {
        return this.http.get<MediaInfo[]>(`/internalapi/autocomplete/${type}`, {params: {input}});
    }
} 