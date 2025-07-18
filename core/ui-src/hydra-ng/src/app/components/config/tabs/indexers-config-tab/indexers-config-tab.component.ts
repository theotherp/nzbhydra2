import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";
import {IndexerConfig} from "../../../../types/config.types";
import {processFieldWrappers} from "../../../../utils/formly-utils";

@Component({
    selector: "app-indexers-config-tab",
    template: `
      <div class="indexers-config-tab p-4">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <formly-form
            [form]="form"
            [fields]="fields"
            [model]="model"
            [options]="options"
            (modelChange)="onModelChange()">
          </formly-form>
        </form>
      </div>
    `,
    standalone: false
})
export class IndexersConfigTabComponent implements OnInit {
    private _showAdvanced = false;

    @Input()
    set showAdvanced(value: boolean) {
        this._showAdvanced = value;
        if (this.fields.length > 0) {
            this.setupForm();
        }
    }

    get showAdvanced(): boolean {
        return this._showAdvanced;
    }
    
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
    @Output() modelChange = new EventEmitter<IndexerConfig[]>();

    form = new FormGroup({});
    model: { indexers: IndexerConfig[] } = {
        indexers: []
    };
    options: FormlyFormOptions = {};
    fields: FormlyFieldConfig[] = [];

    constructor(private configService: ConfigService) {
    }

    ngOnInit() {
        this.loadConfig();
        this.setupForm();
        this.setupFormListeners();
        this.form.markAsPristine();
        this.dirtyChange.emit(false);
    }

    private loadConfig() {
        this.configService.getConfig().subscribe({
            next: (config) => {
                this.model = {indexers: config.indexers || []};
                this.setupForm();
                this.form.markAsPristine();
                this.dirtyChange.emit(false);
            },
            error: (error) => {
                console.error("Error loading indexers config:", error);
            }
        });
    }


    private setupForm() {
        this.fields = [
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Indexers"
                },
                fieldGroup: [
                    {
                        key: "indexers",
                        type: "repeat",
                        props: {
                            label: "Indexer configurations",
                            description: "Configure your indexers (Newznab, Torznab, etc.)"
                        },
                        fieldArray: {
                            fieldGroup: [
                                {
                                    key: "name",
                                    type: "input",
                                    props: {
                                        label: "Name",
                                        required: true,
                                        placeholder: "e.g., NZBGeek, Drunken Slug"
                                    }
                                },
                                {
                                    key: "enabled",
                                    type: "checkbox",
                                    props: {
                                        label: "Enabled",
                                        description: "Whether this indexer is enabled"
                                    }
                                },
                                {
                                    key: "searchModuleType",
                                    type: "select",
                                    wrappers: ["primeng-form-field"],
                                    props: {
                                        label: "Search module type",
                                        required: true,
                                        options: [
                                            {label: "Newznab", value: "NEWZNAB"},
                                            {label: "Torznab", value: "TORZNAB"},
                                            {label: "Jackett Config", value: "JACKETT_CONFIG"},
                                            {label: "Binsearch", value: "BINSEARCH"},
                                            {label: "NZBIndex", value: "NZBINDEX"},
                                            {label: "NZBIndex API", value: "NZBINDEX_API"},
                                            {label: "NZBKing", value: "NZBKING"},
                                            {label: "AniZB", value: "ANIZB"},
                                            {label: "WTFNZB", value: "WTFNZB"},
                                            {label: "TorBox", value: "TORBOX"}
                                        ]
                                    }
                                },
                                {
                                    key: "host",
                                    type: "input",
                                    props: {
                                        label: "Host",
                                        required: true,
                                        placeholder: "indexer.example.com"
                                    }
                                },
                                {
                                    key: "port",
                                    type: "input",
                                    props: {
                                        label: "Port",
                                        type: "number",
                                        min: 1,
                                        max: 65535,
                                        placeholder: "443"
                                    }
                                },
                                {
                                    key: "ssl",
                                    type: "checkbox",
                                    props: {
                                        label: "Use SSL",
                                        description: "Use HTTPS connection"
                                    }
                                },
                                {
                                    key: "sslVerification",
                                    type: "checkbox",
                                    props: {
                                        label: "Verify SSL certificates",
                                        description: "Verify SSL certificates (disable for self-signed certificates)"
                                    }
                                },
                                {
                                    key: "apiKey",
                                    type: "input",
                                    props: {
                                        label: "API Key",
                                        placeholder: "API key for the indexer"
                                    }
                                },
                                {
                                    key: "username",
                                    type: "input",
                                    props: {
                                        label: "Username",
                                        placeholder: "Optional username for authentication"
                                    }
                                },
                                {
                                    key: "password",
                                    type: "input",
                                    props: {
                                        label: "Password",
                                        type: "password",
                                        placeholder: "Optional password for authentication"
                                    }
                                },
                                {
                                    key: "apiPath",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "API Path",
                                        placeholder: "/api",
                                        description: "API path for the indexer",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "backendType",
                                    type: "select",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Backend type",
                                        options: [
                                            {label: "Newznab", value: "NEWZNAB"},
                                            {label: "nZEDb", value: "NZEDB"},
                                            {label: "nntmux", value: "NNTMUX"}
                                        ],
                                        description: "Backend software type",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "downloadType",
                                    type: "select",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Download type",
                                        options: [
                                            {label: "NZB", value: "NZB"},
                                            {label: "Torrent", value: "TORRENT"},
                                            {label: "TorBox", value: "TORBOX"}
                                        ],
                                        description: "Type of downloads this indexer provides",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "searchEnabled",
                                    type: "checkbox",
                                    props: {
                                        label: "Search enabled",
                                        description: "Whether this indexer can be used for searches"
                                    }
                                },
                                {
                                    key: "downloadEnabled",
                                    type: "checkbox",
                                    props: {
                                        label: "Download enabled",
                                        description: "Whether downloads are enabled from this indexer"
                                    }
                                },
                                {
                                    key: "timeout",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Timeout (seconds)",
                                        type: "number",
                                        min: 1,
                                        max: 300,
                                        placeholder: "30",
                                        description: "Request timeout in seconds",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "retries",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Retries",
                                        type: "number",
                                        min: 0,
                                        max: 10,
                                        placeholder: "3",
                                        description: "Number of retry attempts",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "statsRetention",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Stats retention (days)",
                                        type: "number",
                                        min: 1,
                                        max: 365,
                                        placeholder: "30",
                                        description: "How long to keep indexer statistics",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "searchSource",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Search source",
                                        placeholder: "Source identifier for searches",
                                        description: "Search source identifier",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "searchSourceType",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Search source type",
                                        placeholder: "Source type identifier",
                                        description: "Search source type identifier",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "iconCssClass",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Icon CSS class",
                                        placeholder: "e.g., fa fa-rss",
                                        description: "CSS class for the indexer icon",
                                        showAdvanced: this.showAdvanced
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ];

        processFieldWrappers(this.fields);
    }

    private setupFormListeners() {
        this.form.valueChanges.subscribe(() => {
            this.onModelChange();
        });

        this.form.statusChanges.subscribe(() => {
            this.validChange.emit(this.form.valid);
        });
    }

    onSubmit() {
        if (this.form.valid) {
            console.log("Indexers config submitted:", this.model);
        }
    }

    onModelChange() {
        this.dirtyChange.emit(this.form.dirty);
        this.modelChange.emit(this.model.indexers);
    }

    getCurrentModel(): IndexerConfig[] {
        return this.model.indexers;
    }

    isDirty(): boolean {
        return this.form.dirty;
    }

    isValid(): boolean {
        return this.form.valid;
    }

    markAsPristine() {
        this.form.markAsPristine();
        this.dirtyChange.emit(false);
    }
} 