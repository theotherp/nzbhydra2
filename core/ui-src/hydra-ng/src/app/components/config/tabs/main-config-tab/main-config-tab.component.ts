import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";
import {MainConfig} from "../../../../types/config.types";

@Component({
    selector: "app-main-config-tab",
    templateUrl: "./main-config-tab.component.html",
    styleUrls: ["./main-config-tab.component.scss"],
    standalone: false
})
export class MainConfigTabComponent implements OnInit {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
    @Output() modelChange = new EventEmitter<MainConfig>();

    form = new FormGroup({});
    model: MainConfig = {
        configVersion: 21,
        host: "0.0.0.0",
        port: 5076,
        urlBase: "",
        proxyType: "NONE" as any,
        proxyPort: 1080,
        proxyIgnoreLocal: true,
        proxyIgnoreDomains: [],
        proxyImages: false,
        backupBeforeUpdate: true,
        keepHistory: true,
        ssl: false,
        verifySsl: true,
        disableSslLocally: false,
        sniDisabledFor: [],
        verifySslDisabledFor: [],
        updateAutomatically: false,
        updateToPrereleases: false,
        updateCheckEnabled: true,
        showUpdateBannerOnDocker: true,
        showWhatsNewBanner: true,
        showNews: true,
        startupBrowser: true,
        checkOpenPort: true,
        welcomeShown: false,
        theme: "auto",
        databaseCompactTime: 15000,
        databaseRetentionTime: 1000,
        databaseWriteDelay: 5000,
        instanceCounterDownloaded: false,
        shutdownForRestart: false,
        useCsrf: true,
        logging: {
            consolelevel: "INFO",
            historyUserInfoType: "NONE" as any,
            logIpAddresses: false,
            mapIpToHost: false,
            logGc: false,
            logMaxHistory: 7,
            logfilelevel: "INFO",
            logUsername: false,
            markersToLog: []
        }
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
                this.model = config.main;
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
        this.fields = [
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Hosting"
                },
                fieldGroup: [
                    {
                        key: "host",
                        type: "input",
                        props: {
                            label: "Host",
                            type: "text",
                            required: true,
                            placeholder: "IPv4 address to bind to",
                            description: "I strongly recommend using a reverse proxy instead of exposing this directly. Requires restart."
                        },
                        validators: {
                            validation: ["ipAddress"]
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
                            max: 99999,
                            placeholder: "5076",
                            description: "Requires restart."
                        }
                    },
                    {
                        key: "urlBase",
                        type: "input",
                        props: {
                            label: "URL base",
                            type: "text",
                            placeholder: "/nzbhydra",
                            description: "Adapt when using a reverse proxy. Always use when calling Hydra, even locally.",
                            advanced: true
                        },
                        expressions: {
                            hide: "!model.showAdvanced"
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "UI"
                },
                fieldGroup: [
                    {
                        key: "theme",
                        type: "select",
                        props: {
                            label: "Theme",
                            options: [
                                {label: "Auto", value: "auto"},
                                {label: "Grey", value: "grey"},
                                {label: "Bright", value: "bright"},
                                {label: "Dark", value: "dark"}
                            ]
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Security"
                },
                fieldGroup: [
                    {
                        key: "apiKey",
                        type: "input",
                        props: {
                            label: "API Key",
                            type: "text",
                            required: true,
                            description: "Alphanumeric only.",
                            pattern: /^[a-zA-Z0-9]*$/
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Miscellaneous"
                },
                fieldGroup: [
                    {
                        key: "startupBrowser",
                        type: "checkbox",
                        props: {
                            label: "Open browser on startup"
                        }
                    },
                    {
                        key: "showNews",
                        type: "checkbox",
                        props: {
                            label: "Show news",
                            description: "Hydra will occasionally show news when opened. You can always find them in the system section",
                            advanced: true
                        },
                        expressions: {
                            hide: "!model.showAdvanced"
                        }
                    }
                ]
            }
        ];

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
        console.log("Model changed:", this.model);
        this.dirtyChange.emit(this.form.dirty);
        this.modelChange.emit(this.model);
    }

    // Method to get current model for saving
    getCurrentModel(): MainConfig {
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
} 