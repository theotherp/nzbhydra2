import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";
import {AppriseType, NotificationConfig} from "../../../../types/config.types";

@Component({
    selector: "app-notifications-config-tab",
    template: `
      <div class="notifications-config-tab p-4">
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
export class NotificationsConfigTabComponent implements OnInit {
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
    @Output() modelChange = new EventEmitter<NotificationConfig>();

    form = new FormGroup({});
    model: NotificationConfig = {
        appriseType: AppriseType.NONE,
        displayNotifications: true,
        displayNotificationsMax: 10,
        entries: [],
        filterOuts: []
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
                this.model = config.notificationConfig;
                this.setupForm();
                this.form.markAsPristine();
                this.dirtyChange.emit(false);
            },
            error: (error) => {
                console.error("Error loading notifications config:", error);
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
                        key: "displayNotifications",
                        type: "checkbox",
                        props: {
                            label: "Display notifications",
                            description: "Show notifications in the web interface"
                        }
                    },
                    {
                        key: "displayNotificationsMax",
                        type: "input",
                        props: {
                            label: "Maximum displayed notifications",
                            type: "number",
                            min: 1,
                            max: 100,
                            placeholder: "10",
                            description: "Maximum number of notifications to display"
                        }
                    },
                    {
                        key: "appriseType",
                        type: "select",
                        wrappers: ["primeng-form-field"],
                        props: {
                            label: "Apprise type",
                            options: [
                                {label: "None", value: "NONE"},
                                {label: "API", value: "API"},
                                {label: "CLI", value: "CLI"}
                            ],
                            description: "Type of Apprise integration to use"
                        }
                    },
                    {
                        key: "appriseApiUrl",
                        type: "input",
                        props: {
                            label: "Apprise API URL",
                            placeholder: "http://apprise-api:8000",
                            description: "URL of the Apprise API server"
                        },
                        expressions: {
                            hide: "model.appriseType !== 'API'"
                        }
                    },
                    {
                        key: "appriseCliPath",
                        type: "input",
                        props: {
                            label: "Apprise CLI Path",
                            placeholder: "/usr/local/bin/apprise",
                            description: "Path to the Apprise CLI executable"
                        },
                        expressions: {
                            hide: "model.appriseType !== 'CLI'"
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Notification Filters"
                },
                fieldGroup: [
                    {
                        key: "filterOuts",
                        type: "chipsInput",
                        wrappers: ["primeng-form-field"],
                        props: {
                            label: "Filter out notifications",
                            description: "Keywords to filter out from notifications"
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Notification Entries"
                },
                fieldGroup: [
                    {
                        key: "entries",
                        type: "repeat",
                        props: {
                            label: "Notification configurations",
                            description: "Configure notifications for different events"
                        },
                        fieldArray: {
                            fieldGroup: [
                                {
                                    key: "eventType",
                                    type: "select",
                                    wrappers: ["primeng-form-field"],
                                    props: {
                                        label: "Event type",
                                        required: true,
                                        options: [
                                            {label: "VIP Renewal Required", value: "VIP_RENEWAL_REQUIRED"},
                                            {label: "Indexer Disabled", value: "INDEXER_DISABLED"},
                                            {label: "Indexer Re-enabled", value: "INDEXER_REENABLED"},
                                            {label: "Update Installed", value: "UPDATE_INSTALLED"},
                                            {label: "Authentication Failure", value: "AUTH_FAILURE"},
                                            {label: "Result Download", value: "RESULT_DOWNLOAD"},
                                            {label: "Result Download Completion", value: "RESULT_DOWNLOAD_COMPLETION"}
                                        ]
                                    }
                                },
                                {
                                    key: "messageType",
                                    type: "select",
                                    wrappers: ["primeng-form-field"],
                                    props: {
                                        label: "Message type",
                                        required: true,
                                        options: [
                                            {label: "Info", value: "INFO"},
                                            {label: "Success", value: "SUCCESS"},
                                            {label: "Warning", value: "WARNING"},
                                            {label: "Failure", value: "FAILURE"}
                                        ]
                                    }
                                },
                                {
                                    key: "appriseUrls",
                                    type: "textarea",
                                    props: {
                                        label: "Apprise URLs",
                                        placeholder: "discord://webhook_id/webhook_token\ntelegram://bot_token/chat_id",
                                        description: "Apprise notification URLs (one per line)",
                                        rows: 3
                                    }
                                },
                                {
                                    key: "titleTemplate",
                                    type: "input",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Title template",
                                        placeholder: "NZBHydra2 - {{ eventType }}",
                                        description: "Template for notification title",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "bodyTemplate",
                                    type: "textarea",
                                    wrappers: ["advanced"],
                                    props: {
                                        label: "Body template",
                                        placeholder: "Event: {{ eventType }}\nMessage: {{ message }}",
                                        description: "Template for notification body",
                                        rows: 4,
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
            console.log("Notifications config submitted:", this.model);
        }
    }

    onModelChange() {
        this.dirtyChange.emit(this.form.dirty);
        this.modelChange.emit(this.model);
    }

    getCurrentModel(): NotificationConfig {
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