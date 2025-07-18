import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {ConfigService} from "../../../../services/config.service";
import {CategoriesConfig} from "../../../../types/config.types";

@Component({
    selector: "app-categories-config-tab",
    template: `
      <div class="categories-config-tab p-4">
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
export class CategoriesConfigTabComponent implements OnInit {
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
    @Output() modelChange = new EventEmitter<CategoriesConfig>();

    form = new FormGroup({});
    model: CategoriesConfig = {
        enableCategorySizes: true,
        categories: [],
        defaultCategory: "All"
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
                this.model = config.categoriesConfig;
                this.setupForm();
                this.form.markAsPristine();
                this.dirtyChange.emit(false);
            },
            error: (error) => {
                console.error("Error loading categories config:", error);
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
                        key: "enableCategorySizes",
                        type: "checkbox",
                        props: {
                            label: "Enable category sizes",
                            description: "When enabled, categories will have size limits applied"
                        }
                    },
                    {
                        key: "defaultCategory",
                        type: "input",
                        props: {
                            label: "Default category",
                            required: true,
                            placeholder: "All",
                            description: "The default category to select when searching"
                        }
                    }
                ]
            },
            {
                wrappers: ["fieldset"],
                props: {
                    label: "Categories"
                },
                fieldGroup: [
                    {
                        key: "categories",
                        type: "repeat",
                        props: {
                            label: "Category definitions",
                            description: "Define categories and their properties"
                        },
                        fieldArray: {
                            fieldGroup: [
                                {
                                    key: "name",
                                    type: "input",
                                    props: {
                                        label: "Category name",
                                        required: true,
                                        placeholder: "e.g., Movies, TV Shows, Books"
                                    }
                                },
                                {
                                    key: "mayBeSelected",
                                    type: "checkbox",
                                    props: {
                                        label: "May be selected",
                                        description: "Whether this category can be selected by users"
                                    }
                                },
                                {
                                    key: "preselect",
                                    type: "checkbox",
                                    props: {
                                        label: "Preselect",
                                        description: "Whether this category should be preselected by default"
                                    }
                                },
                                {
                                    key: "searchType",
                                    type: "select",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "Search type",
                                        options: [
                                            {label: "General Search", value: "SEARCH"},
                                            {label: "TV Search", value: "TVSEARCH"},
                                            {label: "Movie Search", value: "MOVIE"},
                                            {label: "Music Search", value: "MUSIC"},
                                            {label: "Book Search", value: "BOOK"}
                                        ],
                                        description: "The type of search this category is optimized for",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "subtype",
                                    type: "select",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "Subtype",
                                        options: [
                                            {label: "None", value: "NONE"},
                                            {label: "All", value: "ALL"},
                                            {label: "Anime", value: "ANIME"},
                                            {label: "Audiobook", value: "AUDIOBOOK"},
                                            {label: "Comic", value: "COMIC"},
                                            {label: "Ebook", value: "EBOOK"},
                                            {label: "Magazine", value: "MAGAZINE"}
                                        ],
                                        description: "Subtype specialization for this category",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "description",
                                    type: "input",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Description",
                                        placeholder: "Optional description of this category",
                                        rows: 2,
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "ignoreResultsFrom",
                                    type: "select",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "Ignore results from",
                                        options: [
                                            {label: "None", value: "NONE"},
                                            {label: "Internal", value: "INTERNAL"},
                                            {label: "API", value: "API"},
                                            {label: "Both", value: "BOTH"}
                                        ],
                                        description: "Choose which search sources to ignore results from",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "applyRestrictionsType",
                                    type: "select",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "Apply restrictions type",
                                        options: [
                                            {label: "None", value: "NONE"},
                                            {label: "Internal", value: "INTERNAL"},
                                            {label: "API", value: "API"},
                                            {label: "Both", value: "BOTH"}
                                        ],
                                        description: "When to apply category restrictions",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "applySizeLimitsToApi",
                                    type: "checkbox",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Apply size limits to API",
                                        description: "Whether to apply size limits to API searches",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "minSizePreset",
                                    type: "input",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Minimum size (MB)",
                                        type: "number",
                                        min: 0,
                                        description: "Minimum size limit in MB",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "maxSizePreset",
                                    type: "input",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Maximum size (MB)",
                                        type: "number",
                                        min: 0,
                                        description: "Maximum size limit in MB",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "forbiddenWords",
                                    type: "chipsInput",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "Forbidden words",
                                        description: "Words that will cause results to be rejected",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "requiredWords",
                                    type: "chipsInput",
                                    wrappers: ["advanced", "primeng-form-field"],
                                    props: {
                                        label: "Required words",
                                        description: "Words that must be present in results",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "forbiddenRegex",
                                    type: "input",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Forbidden regex",
                                        placeholder: "e.g., \\b(cam|ts)\\b",
                                        description: "Regular expression for forbidden content",
                                        showAdvanced: this.showAdvanced
                                    }
                                },
                                {
                                    key: "requiredRegex",
                                    type: "input",
                                    wrappers: ["advanced", "form-field"],
                                    props: {
                                        label: "Required regex",
                                        placeholder: "e.g., \\b(1080p|720p)\\b",
                                        description: "Regular expression for required content",
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
            console.log("Categories config submitted:", this.model);
        }
    }

    onModelChange() {
        this.dirtyChange.emit(this.form.dirty);
        this.modelChange.emit(this.model);
    }

    getCurrentModel(): CategoriesConfig {
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