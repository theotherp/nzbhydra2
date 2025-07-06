import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService, MainConfig} from "../../../../services/config.service";

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
        sslKeyStore: "",
        sslKeyStorePassword: "",
        proxyType: "NONE",
        proxyHost: "",
        proxyPort: 1080,
        proxyUsername: "",
        proxyPassword: "",
        externalUrl: "",
        apiKey: "",
        showAdvanced: false
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
        this.fields = [
            {
                type: "fieldset",
                templateOptions: {
                    label: "Hosting"
                },
                fieldGroup: [
                    {
                        key: "host",
                        type: "input",
                        templateOptions: {
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
                        templateOptions: {
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
                        templateOptions: {
                            label: "URL base",
                            type: "text",
                            placeholder: "/nzbhydra",
                            description: "Adapt when using a reverse proxy. Always use when calling Hydra, even locally.",
                            advanced: true
                        },
                        hideExpression: "!model.showAdvanced"
                    }
                ]
            },
            {
                type: "fieldset",
                templateOptions: {
                    label: "SSL Configuration",
                    advanced: true
                },
                fieldGroup: [
                    {
                        key: "ssl",
                        type: "checkbox",
                        templateOptions: {
                            label: "Use SSL",
                            description: "Requires restart. You can use SSL but I recommend using a reverse proxy with SSL."
                        },
                        hideExpression: "!model.showAdvanced"
                    },
                    {
                        key: "sslKeyStore",
                        type: "input",
                        templateOptions: {
                            label: "SSL keystore file",
                            type: "text",
                            required: true,
                            description: "Requires restart."
                        },
                        hideExpression: "!model.ssl || !model.showAdvanced"
                    },
                    {
                        key: "sslKeyStorePassword",
                        type: "input",
                        templateOptions: {
                            label: "SSL keystore password",
                            type: "password",
                            required: true,
                            description: "Requires restart."
                        },
                        hideExpression: "!model.ssl || !model.showAdvanced"
                    }
                ]
            },
            {
                type: "fieldset",
                templateOptions: {
                    label: "Proxy Configuration",
                    description: "You can select to use either a SOCKS or an HTTPS proxy. All outside connections will be done via the configured proxy.",
                    advanced: true
                },
                fieldGroup: [
                    {
                        key: "proxyType",
                        type: "select",
                        templateOptions: {
                            label: "Use proxy",
                            options: [
                                {label: "None", value: "NONE"},
                                {label: "SOCKS", value: "SOCKS"},
                                {label: "HTTP(S)", value: "HTTP"}
                            ]
                        },
                        hideExpression: "!model.showAdvanced"
                    },
                    {
                        key: "proxyHost",
                        type: "input",
                        templateOptions: {
                            label: "Proxy host",
                            type: "text",
                            placeholder: "Set to use a proxy",
                            description: "IPv4 only"
                        },
                        hideExpression: "model.proxyType === 'NONE' || !model.showAdvanced"
                    },
                    {
                        key: "proxyPort",
                        type: "input",
                        templateOptions: {
                            label: "Proxy port",
                            type: "number",
                            placeholder: "1080"
                        },
                        hideExpression: "model.proxyType === 'NONE' || !model.showAdvanced"
                    },
                    {
                        key: "proxyUsername",
                        type: "input",
                        templateOptions: {
                            label: "Proxy username",
                            type: "text"
                        },
                        hideExpression: "model.proxyType === 'NONE' || !model.showAdvanced"
                    },
                    {
                        key: "proxyPassword",
                        type: "input",
                        templateOptions: {
                            label: "Proxy password",
                            type: "password"
                        },
                        hideExpression: "model.proxyType === 'NONE' || !model.showAdvanced"
                    }
                ]
            },
            {
                type: "fieldset",
                templateOptions: {
                    label: "API Configuration"
                },
                fieldGroup: [
                    {
                        key: "apiKey",
                        type: "input",
                        templateOptions: {
                            label: "API Key",
                            type: "text",
                            required: true,
                            description: "Used for API access and external tool integration."
                        }
                    },
                    {
                        key: "externalUrl",
                        type: "input",
                        templateOptions: {
                            label: "External URL",
                            type: "text",
                            placeholder: "https://your-domain.com/nzbhydra",
                            description: "Set this if you access NZBHydra from outside your network.",
                            advanced: true
                        },
                        hideExpression: "!model.showAdvanced"
                    }
                ]
            }
        ];

        // Update model with showAdvanced
        this.model.showAdvanced = this.showAdvanced;
    }

    onSubmit() {
        if (this.form.valid) {
            console.log("Form submitted:", this.model);
        }
    }

    onModelChange() {
        this.dirtyChange.emit(this.form.dirty);
        this.validChange.emit(this.form.valid);
    }
} 