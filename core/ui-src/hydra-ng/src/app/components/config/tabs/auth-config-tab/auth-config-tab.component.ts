import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";

@Component({
    selector: "app-auth-config-tab",
    templateUrl: "./auth-config-tab.component.html",
    standalone: false
})
export class AuthConfigTabComponent implements OnInit {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();

    form = new FormGroup({});
    model: any = {
        authType: "NONE",
        authHeader: "",
        authHeaderIpRanges: [],
        rememberUsers: false,
        rememberMeValidityDays: 14,
        restrictSearch: true,
        restrictStats: true,
        restrictAdmin: true,
        restrictDetailsDl: true,
        restrictIndexerSelection: true,
        allowApiStats: false,
        users: []
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
                this.model = config.auth;
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
                wrappers: ["fieldset"],
                props: {
                    label: "Main"
                },
                fieldGroup: [
                    {
                        key: "authType",
                        type: "select",
                        props: {
                            label: "Auth type",
                            options: [
                                {label: "None", value: "NONE"},
                                {label: "HTTP Basic auth", value: "BASIC"},
                                {label: "Login form", value: "FORM"}
                            ],
                            description: "With auth type 'None' all areas are unrestricted. With auth type 'Form' the basic page is loaded and login is done via a form. With auth type 'Basic' you login via basic HTTP authentication. With all areas restricted this is the most secure as nearly no data is loaded from the server before you auth. Logging out is not supported with basic auth."
                        }
                    },
                    {
                        key: "authHeader",
                        type: "input",
                        props: {
                            label: "Auth header",
                            type: "text",
                            description: "Name of header that provides the username in requests from secure sources.",
                            advanced: true
                        },
                        expressions: {
                            hide: "model.authType === 'NONE'"
                        }
                    },
                    {
                        key: "authHeaderIpRanges",
                        type: "chipsInput",
                        props: {
                            label: "Secure IP ranges",
                            placeholder: "Enter IP ranges...",
                            description: "IP ranges from which the auth header will be accepted. Use IPv4 or IPv6 ranges like '192.168.0.1-192.168.0.100', CIDRs like 192.168.0.0/24 or single IP addresses like '127.0.0.1'.",
                            advanced: true
                        },
                        expressions: {
                            hide: "model.authType === 'NONE' || !model.authHeader"
                        }
                    },
                    {
                        key: "rememberUsers",
                        type: "checkbox",
                        props: {
                            label: "Remember users",
                            description: "Remember users with cookie for 14 days."
                        },
                        expressions: {
                            hide: "model.authType === 'NONE'"
                        }
                    },
                    {
                        key: "rememberMeValidityDays",
                        type: "input",
                        props: {
                            label: "Cookie expiry",
                            type: "number",
                            description: "How long users are remembered.",
                            advanced: true
                        },
                        expressions: {
                            hide: "model.authType === 'NONE'"
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Restrictions",
                    description: "Select which areas/features can only be accessed by logged in users (i.e. are restricted). If you don't want to allow anonymous users to do anything just leave everything selected."
                },
                expressions: {
                    hide: "model.authType === 'NONE'"
                },
                fieldGroup: [
                    {
                        key: "restrictSearch",
                        type: "checkbox",
                        props: {
                            label: "Restrict searching",
                            description: "Restrict access to searching."
                        }
                    },
                    {
                        key: "restrictStats",
                        type: "checkbox",
                        props: {
                            label: "Restrict stats",
                            description: "Restrict access to stats."
                        }
                    },
                    {
                        key: "restrictAdmin",
                        type: "checkbox",
                        props: {
                            label: "Restrict admin",
                            description: "Restrict access to admin functions."
                        }
                    },
                    {
                        key: "restrictDetailsDl",
                        type: "checkbox",
                        props: {
                            label: "Restrict NZB details & DL",
                            description: "Restrict NZB details, comments and download links."
                        }
                    },
                    {
                        key: "restrictIndexerSelection",
                        type: "checkbox",
                        props: {
                            label: "Restrict indexer selection box",
                            description: "Restrict visibility of indexer selection box in search. Affects only GUI."
                        }
                    },
                    {
                        key: "allowApiStats",
                        type: "checkbox",
                        props: {
                            label: "Allow stats access",
                            description: "Allow access to stats via external API."
                        }
                    }
                ]
            },
            {
                type: "repeat",
                key: "users",
                props: {
                    label: "Users",
                    description: "Configure users for authentication"
                },
                expressions: {
                    hide: "model.authType === 'NONE'"
                },
                fieldArray: {
                    fieldGroup: [
                        {
                            key: "username",
                            type: "input",
                            props: {
                                label: "Username",
                                type: "text",
                                required: true
                            }
                        },
                        {
                            key: "password",
                            type: "input",
                            props: {
                                label: "Password",
                                type: "password",
                                required: true
                            }
                        },
                        {
                            key: "maySeeAdmin",
                            type: "checkbox",
                            props: {
                                label: "May see admin area"
                            }
                        },
                        {
                            key: "maySeeStats",
                            type: "checkbox",
                            props: {
                                label: "May see stats"
                            },
                            expressions: {
                                hide: "model.maySeeAdmin"
                            }
                        },
                        {
                            key: "maySeeDetailsDl",
                            type: "checkbox",
                            props: {
                                label: "May see NZB details & DL links"
                            },
                            expressions: {
                                hide: "model.maySeeAdmin"
                            }
                        },
                        {
                            key: "showIndexerSelection",
                            type: "checkbox",
                            props: {
                                label: "May see indexer selection box"
                            },
                            expressions: {
                                hide: "model.maySeeAdmin"
                            }
                        }
                    ]
                }
            }
        ];
    }

    // Method to get current model for saving
    getCurrentModel(): any {
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

    onSubmit() {
        if (this.form.valid) {
            console.log("Auth form submitted:", this.model);
        }
    }
} 