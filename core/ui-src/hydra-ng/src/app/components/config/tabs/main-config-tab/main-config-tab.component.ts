import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";

export interface MainConfig {
    host: string;
    port: number;
    urlBase?: string;
    ssl: boolean;
    theme?: string;
    apiKey: string;
    startupBrowser?: boolean;
    showNews?: boolean;
}

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

    form = new FormGroup({});
    model: MainConfig = {
        host: "0.0.0.0",
        port: 5076,
        urlBase: "",
        ssl: false,
        theme: "auto",
        apiKey: "",
        startupBrowser: true,
        showNews: true
    };
    options: FormlyFormOptions = {};
    fields: FormlyFieldConfig[] = [];

    constructor(private configService: ConfigService) {
    }

    ngOnInit() {
        this.loadConfig();
        this.setupForm();
    }

    private loadConfig() {
        this.configService.getConfig().subscribe({
            next: (config) => {
                this.model = config.main;
                this.setupForm();
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
                            placeholder: "5076",
                            description: "Requires restart."
                        },
                        validators: {
                            validation: ["port"]
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
                            description: "Alphanumeric only."
                        },
                        validators: {
                            validation: ["apiKey"]
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
        // TODO: Implement dirty tracking and validation
    }
} 