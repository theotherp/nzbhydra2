import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";
import {SearchingConfig, SearchSourceRestriction} from "../../../../types/config.types";

@Component({
    selector: "app-searching-config-tab",
    template: `
      <div class="searching-config-tab">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <formly-form [form]="form" [fields]="fields" [model]="model" [options]="options"></formly-form>
        </form>
      </div>
    `,
    standalone: false
})
export class SearchingConfigTabComponent implements OnInit {
    private _showAdvanced = false;

    @Input()
    set showAdvanced(value: boolean) {
        this._showAdvanced = value;
        // Rebuild form when showAdvanced changes
        if (this.fields.length > 0) {
            this.setupForm();
        }
    }

    get showAdvanced(): boolean {
        return this._showAdvanced;
    }

    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
    @Output() modelChange = new EventEmitter<SearchingConfig>();

    form = new FormGroup({});
    model: SearchingConfig = {
        applyRestrictions: SearchSourceRestriction.BOTH,
        coverSize: 128,
        customMappings: [],
        globalCacheTimeMinutes: 15,
        duplicateAgeThreshold: 2.0,
        duplicateSizeThresholdInPercent: 1.0,
        forbiddenGroups: [],
        forbiddenPosters: [],
        forbiddenRegex: "",
        forbiddenWords: [],
        alwaysConvertIds: SearchSourceRestriction.NONE,
        generateQueries: SearchSourceRestriction.INTERNAL,
        generateQueriesFormat: "TITLE" as any,
        historyForSearching: 0,
        idFallbackToQueryGeneration: SearchSourceRestriction.INTERNAL,
        ignorePassworded: false,
        ignoreTemporarilyDisabled: false,
        ignoreLoadLimitingForInternalSearches: false,
        keepSearchResultsForDays: 7,
        language: "en",
        languagesToKeep: [],
        loadAllCachedOnInternal: false,
        loadLimitInternal: 100,
        maxAge: 0,
        minSeeders: 0,
        removeTrailing: [],
        replaceUmlauts: false,
        requiredRegex: "",
        requiredWords: [],
        sendTorznabCategories: true,
        showQuickFilterButtons: true,
        alwaysShowQuickFilterButtons: false,
        customQuickFilterButtons: [],
        preselectQuickFilterButtons: [],
        timeout: 30,
        transformNewznabCategories: false,
        userAgent: "NZBHydra2",
        userAgents: [],
        useOriginalCategories: false,
        wrapApiErrors: false
    };
    options: FormlyFormOptions = {};
    fields: FormlyFieldConfig[] = [];

    constructor(private configService: ConfigService) {
    }

    ngOnInit() {
        this.loadConfig();
        this.setupForm();
        this.setupFormListeners();
        // Ensure form starts as pristine
        this.form.markAsPristine();
        this.dirtyChange.emit(false);
    }

    private loadConfig() {
        this.configService.getConfig().subscribe({
            next: (config) => {
                this.model = config.searching;
                this.setupForm();
                // Mark form as pristine after loading data
                this.form.markAsPristine();
                this.dirtyChange.emit(false);
            },
            error: (error) => {
                console.error("Error loading config:", error);
            }
        });
    }

    private setupForm() {
        console.log("Setting up form with showAdvanced:", this.showAdvanced);
        this.fields = this.getSearchingConfigFields();
        console.log("Fields setup complete:", this.fields);
    }

    private setupFormListeners() {
        // Listen for form value changes
        this.form.valueChanges.subscribe(() => {
            this.onModelChange();
        });

        // Listen for form status changes
        this.form.statusChanges.subscribe(() => {
            this.validChange.emit(this.form.valid);
        });
    }

    onSubmit() {
        if (this.form.valid) {
            console.log("Form submitted:", this.model);
            // For now, just log the form data
            // TODO: Implement proper config saving when all tabs are ready
            console.log("Config to save:", this.model);
        }
    }

    onModelChange() {
        // console.log("Model changed:", this.model);
        this.dirtyChange.emit(this.form.dirty);
        this.modelChange.emit(this.model);
    }

    // Method to get current model for saving
    getCurrentModel(): SearchingConfig {
        return this.model;
    }

    // Method to check if form is dirty
    isDirty(): boolean {
        return this.form.dirty;
    }

    // Method to check if form is valid
    isValid(): boolean {
        return this.form.valid;
    }

    // Method to mark form as pristine (after save)
    markAsPristine() {
        this.form.markAsPristine();
        this.dirtyChange.emit(false);
    }

    private getSearchingConfigFields(): FormlyFieldConfig[] {
        return [
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Indexer access",
                    tooltip: "Settings that control how communication with indexers is done and how to handle errors while doing that.",
                    advanced: true
                },
                fieldGroup: [
                    {
                        key: "timeout",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Timeout when accessing indexers",
                            description: "Any web call to an indexer taking longer than this is aborted.",
                            min: 1,
                            addonRight: {
                                text: "seconds"
                            }
                        }
                    },
                    {
                        key: "userAgent",
                        type: "input",
                        props: {
                            type: "text",
                            label: "User agent",
                            description: "Used when accessing indexers.",
                            required: true,
                            tooltip: "Some indexers don't seem to like Hydra and disable access based on the user agent. You can change it here if you want. Please leave it as it is if you have no problems. This allows indexers to gather better statistics on how their API services are used.",
                        }
                    },
                    {
                        key: "userAgents",
                        type: "chipsInput",
                        props: {
                            type: "text",
                            label: "Map user agents",
                            description: "Used to map the user agent from accessing services to the service names. Apply words with return key.",
                        }
                    },
                    {
                        key: "ignoreLoadLimitingForInternalSearches",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Ignore load limiting internally",
                            description: "When enabled load limiting defined for indexers will be ignored for internal searches.",
                        }
                    },
                    {
                        key: "ignoreTemporarilyDisabled",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Ignore temporary errors",
                            tooltip: "By default if access to an indexer fails the indexer is disabled for a certain amount of time (for a short while first, then increasingly longer if the problems persist). Disable this and always try these indexers.",
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Category handling",
                    tooltip: "Settings that control the handling of newznab categories (e.g. 2000 for Movies).",
                    advanced: true
                },
                fieldGroup: [
                    {
                        key: "transformNewznabCategories",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Transform newznab categories",
                            description: "Map newznab categories from API searches to configured categories and use all configured newznab categories in searches."
                        }
                    },
                    {
                        key: "sendTorznabCategories",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Send categories to trackers",
                            description: "If disabled no categories will be included in queries to torznab indexers (trackers)."
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Media IDs / Query generation / Query processing",
                    tooltip: "Raw search engines like Binsearch don't support searches based on IDs (e.g. for a movie using an IMDB id). You can enable query generation for these. Hydra will then try to retrieve the movie's or show's title and generate a query, for example \"showname s01e01\". In some cases an ID based search will not provide any results. You can enable a fallback so that in such a case the search will be repeated with a query using the title of the show or movie."
                },
                fieldGroup: [
                    {
                        key: "alwaysConvertIds",
                        type: "select",
                        wrappers: ["advanced", "form-field"],
                        props: {
                            label: "Convert media IDs for...",
                            options: [
                                {name: "Internal searches", value: SearchSourceRestriction.INTERNAL},
                                {name: "API searches", value: SearchSourceRestriction.API},
                                {name: "All searches", value: SearchSourceRestriction.BOTH},
                                {name: "Never", value: SearchSourceRestriction.NONE}
                            ],
                            description: "When enabled media ID conversions will always be done even when an indexer supports the already known ID(s).",
                            showAdvanced: this.showAdvanced
                        }
                    },
                    {
                        key: "generateQueries",
                        type: "select",
                        props: {
                            label: "Generate queries",
                            options: [
                                {name: "Internal searches", value: SearchSourceRestriction.INTERNAL},
                                {name: "API searches", value: SearchSourceRestriction.API},
                                {name: "All searches", value: SearchSourceRestriction.BOTH},
                                {name: "Never", value: SearchSourceRestriction.NONE}
                            ],
                            description: "Generate queries for indexers which do not support ID based searches."
                        }
                    },
                    {
                        key: "idFallbackToQueryGeneration",
                        type: "select",
                        props: {
                            label: "Fallback to generated queries",
                            options: [
                                {name: "Internal searches", value: SearchSourceRestriction.INTERNAL},
                                {name: "API searches", value: SearchSourceRestriction.API},
                                {name: "All searches", value: SearchSourceRestriction.BOTH},
                                {name: "Never", value: SearchSourceRestriction.NONE}
                            ],
                            description: "When no results were found for a query ID search again using a generated query (on indexer level)."
                        }
                    },
                    {
                        key: "language",
                        type: "select",
                        props: {
                            type: "text",
                            label: "Language",
                            required: true,
                            description: "Used for movie query generation and autocomplete only.",
                            options: this.getLanguageOptions()
                        }
                    },
                    {
                        key: "replaceUmlauts",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Replace umlauts and diacritics",
                            description: "Replace diacritics (e.g. è) and german umlauts and special characters (ä, ö, ü and ß) in external request queries."
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Result filters",
                    tooltip: "This section allows you to define global filters which will be applied to all search results. You can define words and regexes which must or must not be matched for a search result to be matched. You can also exclude certain usenet posters and groups which are known for spamming. You can define forbidden and required words for categories in the next tab (Categories). Usually required or forbidden words are applied on a word base, so they must form a complete word in a title. Only if they contain a dash or a dot they may appear anywhere in the title. Example: \"ea\" matches \"something.from.ea\" but not \"release.from.other\". \"web-dl\" matches \"title.web-dl\" and \"someweb-dl\"."
                },
                fieldGroup: [
                    {
                        key: "applyRestrictions",
                        type: "select",
                        props: {
                            label: "Apply word filters",
                            options: [
                                {name: "All searches", value: SearchSourceRestriction.BOTH},
                                {name: "Internal searches", value: SearchSourceRestriction.INTERNAL},
                                {name: "API searches", value: SearchSourceRestriction.API},
                                {name: "Never", value: SearchSourceRestriction.NONE}
                            ],
                            description: "For which type of search word/regex filters will be applied"
                        }
                    },
                    {
                        key: "forbiddenWords",
                        type: "chipsInput",
                        props: {
                            type: "text",
                            label: "Forbidden words",
                            description: "Results with any of these words in the title will be ignored. Title is converted to lowercase before. Apply words with return key.",
                            tooltip: "One forbidden word in a result title dismisses the result."
                        },
                        hideExpression: (model: any) => model.applyRestrictions === SearchSourceRestriction.NONE
                    },
                    {
                        key: "forbiddenRegex",
                        type: "input",
                        wrappers: ["advanced", "form-field"],
                        props: {
                            type: "text",
                            label: "Forbidden regex",
                            description: "Must not be present in a title (case is ignored).",
                            showAdvanced: this.showAdvanced
                        },
                        hideExpression: (model: any) => model.applyRestrictions === SearchSourceRestriction.NONE
                    },
                    {
                        key: "requiredWords",
                        type: "chipsInput",
                        props: {
                            type: "text",
                            label: "Required words",
                            description: "Only results with titles that contain *all* words will be used. Title is converted to lowercase before. Apply words with return key.",
                            tooltip: "If any of the required words is not found anywhere in a result title it's also dismissed."
                        },
                        hideExpression: (model: any) => model.applyRestrictions === SearchSourceRestriction.NONE
                    },
                    {
                        key: "requiredRegex",
                        type: "input",
                        wrappers: ["advanced", "form-field"],
                        props: {
                            type: "text",
                            label: "Required regex",
                            description: "Must be present in a title (case is ignored).",
                            showAdvanced: this.showAdvanced
                        },
                        hideExpression: (model: any) => model.applyRestrictions === SearchSourceRestriction.NONE
                    },
                    {
                        key: "forbiddenGroups",
                        type: "chipsInput",
                        props: {
                            type: "text",
                            label: "Forbidden groups",
                            description: "Posts from any groups containing any of these words will be ignored. Apply words with return key.",
                            advanced: true
                        },
                        hideExpression: (model: any) => model.applyRestrictions === SearchSourceRestriction.NONE
                    },
                    {
                        key: "forbiddenPosters",
                        type: "chipsInput",
                        props: {
                            type: "text",
                            label: "Forbidden posters",
                            description: "Posts from any posters containing any of these words will be ignored. Apply words with return key.",
                            advanced: true
                        }
                    },
                    {
                        key: "languagesToKeep",
                        type: "chipsInput",
                        props: {
                            type: "text",
                            label: "Languages to keep",
                            description: "If an indexer returns the language in the results only those results with configured languages will be used. Apply words with return key."
                        }
                    },
                    {
                        key: "maxAge",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Maximum results age",
                            description: "Results older than this are ignored. Can be overwritten per search. Apply words with return key.",
                            addonRight: {
                                text: "days"
                            }
                        }
                    },
                    {
                        key: "minSeeders",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Minimum # seeders",
                            description: "Torznab results with fewer seeders will be ignored."
                        }
                    },
                    {
                        key: "ignorePassworded",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Ignore passworded releases",
                            description: "Not all indexers provide this information",
                            tooltip: "Some indexers provide information if a release is passworded. If you select to ignore these releases only those will be ignored of which I know for sure that they're actually passworded."
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Result processing"
                },
                fieldGroup: [
                    {
                        key: "wrapApiErrors",
                        type: "checkbox",
                        props: {
                            type: "text",
                            label: "Wrap API errors in empty results page",
                            description: "When enabled accessing tools will think the search was completed successfully but without results.",
                            tooltip: "In (hopefully) rare cases Hydra may crash when processing an API search request. You can enable to return an empty search page in these cases (if Hydra hasn't crashed altogether ). This means that the calling tool (e.g. Sonarr) will think that the indexer (Hydra) is fine but just didn't return a result. That way Hydra won't be disabled as indexer but on the downside you may not be directly notified that an error occurred.",
                            advanced: true
                        }
                    },
                    {
                        key: "removeTrailing",
                        type: "chipsInput",
                        props: {
                            type: "text",
                            label: "Remove trailing...",
                            description: "Removed from title if it ends with either of these. Case insensitive and disregards leading/trailing spaces. Allows wildcards (\"*\"). Apply words with return key.",
                            tooltip: "Hydra contains a predefined list of words which will be removed if a search result title ends with them. This allows better duplicate detection and cleans up the titles. Trailing words will be removed until none of the defined strings are found at the end of the result title."
                        }
                    },
                    {
                        key: "useOriginalCategories",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Use original categories",
                            description: "Enable to use the category descriptions provided by the indexer.",
                            tooltip: "Hydra attempts to parse the provided newznab category IDs for results and map them to the configured categories. In some cases this may lead to category names which are not quite correct. You can select to use the original category name used by the indexer. This will only affect which category name is shown in the results.",
                            advanced: true
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                type: "repeat",
                key: "customMappings",

                props: {
                    tooltip: "Here you can define mappings to modify either queries or titles for search requests or to dynamically change the titles of found results. The former allows you, for example,  to change requests made by external tools, the latter to clean up results by indexers in a more advanced way.",
                    btnText: "Add new custom mapping",
                    altLegendText: "Mapping",
                    headline: "Custom mappings of queries, search titles and result titles",
                    advanced: true,
                    defaultModel: {
                        searchType: null,
                        affectedValue: null,
                        matchAll: true,
                        from: null,
                        to: null
                    }
                },
                fieldArray: {
                    fieldGroup: [
                        {
                            key: "affectedValue",
                            type: "select",
                            props: {
                                label: "Affected value",
                                options: [
                                    {label: "Query", value: "QUERY"},
                                    {label: "Search title", value: "TITLE"},
                                    {label: "Result title", value: "RESULT_TITLE"},
                                ],
                                required: true,
                                description: "Determines which value of the search request or result will be processed"
                            }
                        },
                        {
                            key: "searchType",
                            type: "select",
                            expressions: {
                                hide: (field) => field.model?.affectedValue === "RESULT_TITLE",
                            },
                            props: {
                                label: "Search type",
                                options: [
                                    {label: "General", value: "SEARCH"},
                                    {label: "Audio", value: "MUSIC"},
                                    {label: "EBook", value: "BOOK"},
                                    {label: "Movie", value: "MOVIE"},
                                    {label: "TV", value: "TVSEARCH"}
                                ],
                                required: true,
                                description: "Determines in what context the mapping will be executed"
                            }
                        },
                        {
                            key: "matchAll",
                            type: "checkbox",
                            props: {
                                label: "Match whole string",
                                description: "If true then the input pattern must match the whole affected value. If false then any match will be replaced, even if it's only part of the affected value."
                            }
                        },
                        {
                            key: "from",
                            type: "input",
                            props: {
                                type: "text",
                                label: "Input pattern",
                                description: "Pattern which must match the query or title of a search request (completely or in part, depending on the previous setting). You may use regexes in groups which can be referenced in the output puttern by using <code>{group:regex}</code>. Case insensitive.",
                                required: true
                            }
                        },
                        {
                            key: "to",
                            type: "input",
                            props: {
                                type: "text",
                                label: "Output pattern",
                                required: true,
                                description: "If a query or title matches the input pattern it will be replaced using this. You may reference groups from the input pattern by using {group}. Additionally you may use <code>{season:0}</code> or <code>{season:00}</code> or <code>{episode:0}</code> or <code>{episode:00}</code> (with and without leading zeroes). Use <code>&lt;remove&gt;</code> to remove the match."
                            }
                        },
                        {
                            type: "customMappingTest",
                        }
                    ]
                }
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Result display"
                },
                fieldGroup: [
                    {
                        key: "loadAllCachedOnInternal",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Display all retrieved results",
                            description: "Load all results already retrieved from indexers. Might make sorting / filtering a bit slower. Will still be paged according to the limit set above.",
                            advanced: true
                        }
                    },
                    {
                        key: "loadLimitInternal",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Display...",
                            addonRight: {
                                text: "results per page"
                            },
                            max: 500,
                            required: true,
                            description: "Determines the number of results shown on one page. This might also cause more API hits because indexers are queried until the number of results is matched or all indexers are exhausted. Limit is 500.",
                            advanced: true
                        }
                    },
                    {
                        key: "coverSize",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Cover width",
                            addonRight: {
                                text: "px"
                            },
                            required: true,
                            description: "Determines width of covers in search results (when enabled in display options)."
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Quick filters"
                },
                fieldGroup: [
                    {
                        key: "showQuickFilterButtons",
                        type: "checkbox",
                        props: {
                            type: "switch",
                            label: "Show quick filters",
                            description: "Show quick filter buttons for movie and TV results."
                        }
                    },
                    {
                        key: "alwaysShowQuickFilterButtons",
                        type: "checkbox",
                        hideExpression: (model: any) => !model.showQuickFilterButtons,
                        props: {
                            type: "switch",
                            label: "Always show quick filters",
                            description: "Show all quick filter buttons for all types of searches.",
                            advanced: true
                        }
                    },
                    {
                        key: "customQuickFilterButtons",
                        type: "chipsInput",
                        hideExpression: (model: any) => !model.showQuickFilterButtons,
                        props: {
                            type: "text",
                            label: "Custom quick filters",
                            description: "Enter in the format <code>DisplayName=Required1,Required2</code>. Prefix words with ! to exclude them. Surround with <code>/<code> to mark as a regex. Apply values with enter key.",
                            tooltip: "E.g. use <code>WEB=webdl,web-dl.</code> for a quick filter with the name \"WEB\" to be displayed that searches for \"webdl\" and \"web-dl\" in lowercase search results.",
                            advanced: true
                        }
                    },
                    {
                        key: "preselectQuickFilterButtons",
                        type: "multiselect",
                        hideExpression: (model: any) => !model.showQuickFilterButtons,
                        props: {
                            label: "Preselect quickfilters",
                            description: "Choose which quickfilters will be selected by default.",
                            options: this.getQuickFilterOptions(),
                            tooltip: "To select custom quickfilters you just entered please save the config first.",
                            buttonText: "None",
                            advanced: true
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Duplicate detection",
                    tooltip: "Hydra tries to find duplicate results from different indexers using heuristics. You can control the parameters for that but usually the default values work quite well.",
                    advanced: true
                },
                fieldGroup: [
                    {
                        key: "duplicateSizeThresholdInPercent",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Duplicate size threshold",
                            required: true,
                            addonRight: {
                                text: "%"
                            }
                        }
                    },
                    {
                        key: "duplicateAgeThreshold",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Duplicate age threshold",
                            required: true,
                            addonRight: {
                                text: "hours"
                            }
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Other",
                    advanced: true
                },
                fieldGroup: [
                    {
                        key: "keepSearchResultsForDays",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Store results for ...",
                            addonRight: {
                                text: "days"
                            },
                            required: true,
                            tooltip: "Found results are stored in the database for this long until they're deleted. After that any links to Hydra results still stored elsewhere become invalid. You can increase the limit if you want, the disc space needed is negligible (about 75 MB for 7 days on my server)."
                        }
                    },
                    {
                        key: "historyForSearching",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Recent searches in search bar",
                            required: true,
                            tooltip: "The number of recent searches shown in the search bar dropdown (the <span class=\"glyphicon glyphicon-time\"></span> icon)."
                        }
                    },
                    {
                        key: "globalCacheTimeMinutes",
                        type: "input",
                        props: {
                            type: "number",
                            label: "Results cache time",
                            description: "When set search results will be cached for this time. Any search with the same parameters will return the cached results. API cache time parameters will be preferred. See <a href=\"https://github.com/theotherp/nzbhydra2/wiki/External-API,-RSS-and-cached-queries\" target=\"_blank\">wiki</a>.",
                            addonRight: {
                                text: "minutes"
                            }
                        }
                    }
                ]
            }
        ];
    }

    private getLanguageOptions() {
        return [
            {name: "Abkhaz", value: "ab"}, {name: "Afar", value: "aa"}, {name: "Afrikaans", value: "af"},
            {name: "Akan", value: "ak"}, {name: "Albanian", value: "sq"}, {name: "Amharic", value: "am"},
            {name: "Arabic", value: "ar"}, {name: "Aragonese", value: "an"}, {name: "Armenian", value: "hy"},
            {name: "Assamese", value: "as"}, {name: "Avaric", value: "av"}, {name: "Avestan", value: "ae"},
            {name: "Aymara", value: "ay"}, {name: "Azerbaijani", value: "az"}, {name: "Bambara", value: "bm"},
            {name: "Bashkir", value: "ba"}, {name: "Basque", value: "eu"}, {name: "Belarusian", value: "be"},
            {name: "Bengali", value: "bn"}, {name: "Bihari", value: "bh"}, {name: "Bislama", value: "bi"},
            {name: "Bosnian", value: "bs"}, {name: "Breton", value: "br"}, {name: "Bulgarian", value: "bg"},
            {name: "Burmese", value: "my"}, {name: "Catalan", value: "ca"}, {name: "Chamorro", value: "ch"},
            {name: "Chechen", value: "ce"}, {name: "Chichewa", value: "ny"}, {name: "Chinese", value: "zh"},
            {name: "Chuvash", value: "cv"}, {name: "Cornish", value: "kw"}, {name: "Corsican", value: "co"},
            {name: "Cree", value: "cr"}, {name: "Croatian", value: "hr"}, {name: "Czech", value: "cs"},
            {name: "Danish", value: "da"}, {name: "Divehi", value: "dv"}, {name: "Dutch", value: "nl"},
            {name: "Dzongkha", value: "dz"}, {name: "English", value: "en"}, {name: "Esperanto", value: "eo"},
            {name: "Estonian", value: "et"}, {name: "Ewe", value: "ee"}, {name: "Faroese", value: "fo"},
            {name: "Fijian", value: "fj"}, {name: "Finnish", value: "fi"}, {name: "French", value: "fr"},
            {name: "Fula", value: "ff"}, {name: "Galician", value: "gl"}, {name: "Georgian", value: "ka"},
            {name: "German", value: "de"}, {name: "Greek", value: "el"}, {name: "Guaraní", value: "gn"},
            {name: "Gujarati", value: "gu"}, {name: "Haitian", value: "ht"}, {name: "Hausa", value: "ha"},
            {name: "Hebrew", value: "he"}, {name: "Herero", value: "hz"}, {name: "Hindi", value: "hi"},
            {name: "Hiri Motu", value: "ho"}, {name: "Hungarian", value: "hu"}, {name: "Interlingua", value: "ia"},
            {name: "Indonesian", value: "id"}, {name: "Interlingue", value: "ie"}, {name: "Irish", value: "ga"},
            {name: "Igbo", value: "ig"}, {name: "Inupiaq", value: "ik"}, {name: "Ido", value: "io"},
            {name: "Icelandic", value: "is"}, {name: "Italian", value: "it"}, {name: "Inuktitut", value: "iu"},
            {name: "Japanese", value: "ja"}, {name: "Javanese", value: "jv"}, {name: "Kalaallisut", value: "kl"},
            {name: "Kannada", value: "kn"}, {name: "Kanuri", value: "kr"}, {name: "Kashmiri", value: "ks"},
            {name: "Kazakh", value: "kk"}, {name: "Khmer", value: "km"}, {name: "Kikuyu", value: "ki"},
            {name: "Kinyarwanda", value: "rw"}, {name: "Kyrgyz", value: "ky"}, {name: "Komi", value: "kv"},
            {name: "Kongo", value: "kg"}, {name: "Korean", value: "ko"}, {name: "Kurdish", value: "ku"},
            {name: "Kwanyama", value: "kj"}, {name: "Latin", value: "la"}, {name: "Luxembourgish", value: "lb"},
            {name: "Ganda", value: "lg"}, {name: "Limburgish", value: "li"}, {name: "Lingala", value: "ln"},
            {name: "Lao", value: "lo"}, {name: "Lithuanian", value: "lt"}, {name: "Luba-Katanga", value: "lu"},
            {name: "Latvian", value: "lv"}, {name: "Manx", value: "gv"}, {name: "Macedonian", value: "mk"},
            {name: "Malagasy", value: "mg"}, {name: "Malay", value: "ms"}, {name: "Malayalam", value: "ml"},
            {name: "Maltese", value: "mt"}, {name: "Māori", value: "mi"}, {name: "Marathi", value: "mr"},
            {name: "Marshallese", value: "mh"}, {name: "Mongolian", value: "mn"}, {name: "Nauru", value: "na"},
            {name: "Navajo", value: "nv"}, {name: "Northern Ndebele", value: "nd"}, {name: "Nepali", value: "ne"},
            {name: "Ndonga", value: "ng"}, {name: "Norwegian Bokmål", value: "nb"}, {name: "Norwegian Nynorsk", value: "nn"},
            {name: "Norwegian", value: "no"}, {name: "Nuosu", value: "ii"}, {name: "Southern Ndebele", value: "nr"},
            {name: "Occitan", value: "oc"}, {name: "Ojibwe", value: "oj"}, {name: "Old Church Slavonic", value: "cu"},
            {name: "Oromo", value: "om"}, {name: "Oriya", value: "or"}, {name: "Ossetian", value: "os"},
            {name: "Panjabi", value: "pa"}, {name: "Pāli", value: "pi"}, {name: "Persian", value: "fa"},
            {name: "Polish", value: "pl"}, {name: "Pashto", value: "ps"}, {name: "Portuguese", value: "pt"},
            {name: "Quechua", value: "qu"}, {name: "Romansh", value: "rm"}, {name: "Kirundi", value: "rn"},
            {name: "Romanian", value: "ro"}, {name: "Russian", value: "ru"}, {name: "Sanskrit", value: "sa"},
            {name: "Sardinian", value: "sc"}, {name: "Sindhi", value: "sd"}, {name: "Northern Sami", value: "se"},
            {name: "Samoan", value: "sm"}, {name: "Sango", value: "sg"}, {name: "Serbian", value: "sr"},
            {name: "Gaelic", value: "gd"}, {name: "Shona", value: "sn"}, {name: "Sinhala", value: "si"},
            {name: "Slovak", value: "sk"}, {name: "Slovene", value: "sl"}, {name: "Somali", value: "so"},
            {name: "Southern Sotho", value: "st"}, {name: "Spanish", value: "es"}, {name: "Sundanese", value: "su"},
            {name: "Swahili", value: "sw"}, {name: "Swati", value: "ss"}, {name: "Swedish", value: "sv"},
            {name: "Tamil", value: "ta"}, {name: "Telugu", value: "te"}, {name: "Tajik", value: "tg"},
            {name: "Thai", value: "th"}, {name: "Tigrinya", value: "ti"}, {name: "Tibetan Standard", value: "bo"},
            {name: "Turkmen", value: "tk"}, {name: "Tagalog", value: "tl"}, {name: "Tswana", value: "tn"},
            {name: "Tonga", value: "to"}, {name: "Turkish", value: "tr"}, {name: "Tsonga", value: "ts"},
            {name: "Tatar", value: "tt"}, {name: "Twi", value: "tw"}, {name: "Tahitian", value: "ty"},
            {name: "Uyghur", value: "ug"}, {name: "Ukrainian", value: "uk"}, {name: "Urdu", value: "ur"},
            {name: "Uzbek", value: "uz"}, {name: "Venda", value: "ve"}, {name: "Vietnamese", value: "vi"},
            {name: "Volapük", value: "vo"}, {name: "Walloon", value: "wa"}, {name: "Welsh", value: "cy"},
            {name: "Wolof", value: "wo"}, {name: "Western Frisian", value: "fy"}, {name: "Xhosa", value: "xh"},
            {name: "Yiddish", value: "yi"}, {name: "Yoruba", value: "yo"}, {name: "Zhuang", value: "za"},
            {name: "Zulu", value: "zu"}
        ];
    }

    private getQuickFilterOptions() {
        return [
            {id: "source|camts", label: "CAM / TS"},
            {id: "source|tv", label: "TV"},
            {id: "source|web", label: "WEB"},
            {id: "source|dvd", label: "DVD"},
            {id: "source|bluray", label: "Blu-Ray"},
            {id: "quality|q480p", label: "480p"},
            {id: "quality|q720p", label: "720p"},
            {id: "quality|q1080p", label: "1080p"},
            {id: "quality|q2160p", label: "2160p"},
            {id: "other|q3d", label: "3D"},
            {id: "other|qx265", label: "x265"},
            {id: "other|qhevc", label: "HEVC"},
        ];
    }
} 