import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";
import {DownloadingConfig, FileDownloadAccessType, SearchSourceRestriction} from "../../../../types/config.types";

@Component({
    selector: "app-downloading-config-tab",
    template: `
      <div class="downloading-config-tab p-4">
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
export class DownloadingConfigTabComponent implements OnInit {
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
    @Output() modelChange = new EventEmitter<DownloadingConfig>();

    form = new FormGroup({});
    model: DownloadingConfig = {
        downloaders: [],
        sendMagnetLinks: false,
        updateStatuses: true,
        showDownloaderStatus: true,
        nzbAccessType: FileDownloadAccessType.REDIRECT,
        fallbackForFailed: SearchSourceRestriction.NONE
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
                this.model = config.downloading;
                this.setupForm();
                this.form.markAsPristine();
                this.dirtyChange.emit(false);
            },
            error: (error) => {
                console.error("Error loading downloading config:", error);
            }
        });
    }

    private setupForm() {
        this.fields = [
            {
                wrappers: ["fieldset"],
                props: {
                    label: "General Settings"
                },
                fieldGroup: [
                    {
                        key: "updateStatuses",
                        type: "checkbox",
                        props: {
                            label: "Update download statuses",
                            description: "Whether to regularly check and update download statuses"
                        }
                    },
                    {
                        key: "showDownloaderStatus",
                        type: "checkbox",
                        props: {
                            label: "Show downloader status",
                            description: "Display downloader status information in the UI"
                        }
                    },
                    {
                        key: "sendMagnetLinks",
                        type: "checkbox",
                        props: {
                            label: "Send magnet links",
                            description: "Send magnet links instead of torrent files when possible"
                        }
                    },
                    {
                        key: "nzbAccessType",
                        type: "select",
                        wrappers: ["primeng-form-field"],
                        props: {
                            label: "NZB access type",
                            required: true,
                            options: [
                                {label: "Redirect", value: "REDIRECT"},
                                {label: "Proxy", value: "PROXY"}
                            ],
                            description: "How to handle NZB file downloads"
                        }
                    },
                    {
                        key: "fallbackForFailed",
                        type: "select",
                        wrappers: ["primeng-form-field"],
                        props: {
                            label: "Fallback for failed downloads",
                            options: [
                                {label: "None", value: "NONE"},
                                {label: "Internal", value: "INTERNAL"},
                                {label: "API", value: "API"},
                                {label: "Both", value: "BOTH"}
                            ],
                            description: "When to use fallback indexers for failed downloads"
                        }
                    },
                    {
                        key: "primaryDownloader",
                        type: "input",
                        wrappers: ["advanced", "form-field"],
                        props: {
                            label: "Primary downloader",
                            placeholder: "Leave empty for automatic selection",
                            description: "Name of the primary downloader to use",
                            showAdvanced: this.showAdvanced
                        }
                    },
                    {
                        key: "externalUrl",
                        type: "input",
                        wrappers: ["advanced", "form-field"],
                        props: {
                            label: "External URL",
                            placeholder: "https://example.com/nzbhydra2",
                            description: "External URL for NZBHydra2 (used for downloader callbacks)",
                            showAdvanced: this.showAdvanced
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "File Storage"
                },
                fieldGroup: [
                    {
                        key: "saveNzbsTo",
                        type: "input",
                        wrappers: ["advanced", "form-field"],
                        props: {
                            label: "Save NZBs to",
                            placeholder: "/path/to/nzb/folder",
                            description: "Directory to save NZB files to",
                            showAdvanced: this.showAdvanced
                        }
                    },
                    {
                        key: "saveTorrentsTo",
                        type: "input",
                        wrappers: ["advanced", "form-field"],
                        props: {
                            label: "Save torrents to",
                            placeholder: "/path/to/torrent/folder",
                            description: "Directory to save torrent files to",
                            showAdvanced: this.showAdvanced
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Downloaders"
                },
                fieldGroup: [
                    {
                        key: "downloaders",
                        type: "repeat",
                        props: {
                            label: "Downloader configurations",
                            description: "Configure your download clients (SABnzbd, NZBGet, etc.)"
                        },
                        fieldArray: {
                            fieldGroup: [
                                {
                                    key: "name",
                                    type: "input",
                                    props: {
                                        label: "Name",
                                        required: true,
                                        placeholder: "e.g., SABnzbd, NZBGet"
                                    }
                                },
                                {
                                    key: "downloaderType",
                                    type: "select",
                                    wrappers: ["primeng-form-field"],
                                    props: {
                                        label: "Downloader type",
                                        required: true,
                                        options: [
                                            {label: "SABnzbd", value: "SABNZBD"},
                                            {label: "NZBGet", value: "NZBGET"},
                                            {label: "TorBox", value: "TORBOX"}
                                        ]
                                    }
                                },
                                {
                                    key: "enabled",
                                    type: "checkbox",
                                    props: {
                                        label: "Enabled",
                                        description: "Whether this downloader is enabled"
                                    }
                                },
                                {
                                    key: "host",
                                    type: "input",
                                    props: {
                                        label: "Host",
                                        required: true,
                                        placeholder: "localhost"
                                    }
                                },
                                {
                                    key: "port",
                                    type: "input",
                                    props: {
                                        label: "Port",
                                        type: "number",
                                        required: true,
                                        min: 1,
                                        max: 65535,
                                        placeholder: "8080"
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
                                    key: "apiKey",
                                    type: "input",
                                    props: {
                                        label: "API Key",
                                        placeholder: "API key for the downloader"
                                    }
                                },
                                {
                                    key: "defaultCategory",
                                    type: "input",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Default category",
                                        placeholder: "Category to use when none is specified",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "nzbAddingType",
                                    type: "select",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "NZB adding type",
                                        options: [
                                            {label: "Upload", value: "UPLOAD"},
                                            {label: "Send link", value: "SEND_LINK"}
                                        ],
                                        description: "How to send NZBs to the downloader",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "fileDownloadAccessType",
                                    type: "select",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "File download access type",
                                        options: [
                                            {label: "Redirect", value: "REDIRECT"},
                                            {label: "Proxy", value: "PROXY"}
                                        ],
                                        description: "How to handle file downloads",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "iconCssClass",
                                    type: "input",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Icon CSS class",
                                        placeholder: "e.g., fa fa-download",
                                        description: "CSS class for the downloader icon",
                                        showAdvanced: this.showAdvanced
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ];
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
            console.log("Downloading config submitted:", this.model);
        }
    }

    onModelChange() {
        this.dirtyChange.emit(this.form.dirty);
        this.modelChange.emit(this.model);
    }

    getCurrentModel(): DownloadingConfig {
        return this.model;
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