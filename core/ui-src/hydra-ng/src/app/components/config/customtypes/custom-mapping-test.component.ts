import {CommonModule} from "@angular/common";
import {HttpClient} from "@angular/common/http";
import {ChangeDetectorRef, Component, OnInit} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {FieldType, FieldTypeConfig} from "@ngx-formly/core";
import {ButtonModule} from "primeng/button";
import {DialogService, DynamicDialogConfig, DynamicDialogModule, DynamicDialogRef} from "primeng/dynamicdialog";
import {InputTextModule} from "primeng/inputtext";
import {SelectModule} from "primeng/select";
import {ToggleSwitchModule} from "primeng/toggleswitch";
import {CustomMappingAffectedValue, CustomMappingSearchType, CustomQueryAndTitleMapping} from "../../../types/config.types";

@Component({
    selector: "app-custom-mapping-test",
    template: `
      <div class="custom-mapping-test">
        <p-button
          label="Help and test"
          icon="pi pi-question-circle"
          (click)="openDialog()"
          [outlined]="true">
        </p-button>
      </div>
    `,
    standalone: true,
    imports: [ButtonModule, DynamicDialogModule]
})
export class CustomMappingTestComponent extends FieldType<FieldTypeConfig> implements OnInit {

    constructor(
        private http: HttpClient,
        private dialogService: DialogService,
        private cdr: ChangeDetectorRef
    ) {
        super();
    }

    ngOnInit() {
        // Component initialization
    }

    openDialog() {
        // Get the current model from parent since this field doesn't have a key
        const model = this.field.parent?.model as CustomQueryAndTitleMapping;
        const modelCopy = structuredClone(model);
        console.log("[CustomMappingTest] openDialog: current model", model);

        const ref = this.dialogService.open(CustomMappingTestDialogComponent, {
            header: "Custom query and title mapping help and test",
            width: "800px",
            modal: true,
            data: {
                model: modelCopy
            }
        });

        ref.onClose.subscribe((result) => {
            console.log("[CustomMappingTest] Dialog closed. Result:", result);
            if (result) {
                // Get the current model from parent
                const currentModel = this.field.parent?.model as CustomQueryAndTitleMapping;
                console.log("[CustomMappingTest] Current model:", currentModel);

                // Find the parent array and index of the current item
                const parentField = this.field.parent;
                if (!parentField) {
                    console.warn("[CustomMappingTest] No parent field found!");
                    return;
                }

                // Get the grandparent to access the actual array
                const grandParentField = parentField.parent;
                if (!grandParentField) {
                    console.warn("[CustomMappingTest] No grandparent field found!");
                    return;
                }

                const parentArray = grandParentField.model as CustomQueryAndTitleMapping[];
                console.log("[CustomMappingTest] Parent array before update:", parentArray);

                if (!Array.isArray(parentArray)) {
                    console.warn("[CustomMappingTest] Parent array is not an array:", parentArray);
                    return;
                }

                const idx = parentArray.indexOf(currentModel);
                console.log("[CustomMappingTest] Index of current model in parent array:", idx);

                if (idx > -1) {
                    // Create a new array and replace the item at idx
                    const newArray = [...parentArray];
                    newArray[idx] = result;
                    console.log("[CustomMappingTest] New array after replacement:", newArray);

                    // Update the array using the form control's parent form
                    const parentFormControl = grandParentField.formControl;
                    if (parentFormControl) {
                        parentFormControl.setValue(newArray);
                        parentFormControl.markAsDirty();
                        console.log("[CustomMappingTest] Updated parent form control with new array");
                    } else {
                        console.warn("[CustomMappingTest] No parent form control found");
                    }

                    // Update the form control value for this field
                    this.formControl.setValue(result);
                    this.formControl.markAsDirty();
                    console.log("[CustomMappingTest] Form control value after setValue:", this.formControl.value);
                } else {
                    console.warn("[CustomMappingTest] Index not found in parent array!");
                }
            }
        });
    }
}

@Component({
    selector: "app-custom-mapping-test-dialog",
    template: `
      <div class="custom-mapping-dialog">
        <div class="help-section mb-4">
          <div class="p-4 border-round surface-100">
            <ul class="list-none p-0 m-0">
              <li class="mb-2">
                <i class="pi pi-info-circle mr-2"></i>
                The input must completely match the title or query for the customQueryAndTitleMapping to be effective. The matching is case
                insensitive.
              </li>
              <li class="mb-2">
                <i class="pi pi-info-circle mr-2"></i>
                You may use regular expressions anywhere (e.g. <code>[a-z]</code> or <code>.*</code>). You may use named groups to reference
                them in the output pattern (e.g. <code>{{ '{' }}title:.*{{ '}' }}</code> can be referenced using <code>{{ '{' }}
                title{{ '}' }}</code>) but they must not start with digits. Brackets ("{{ '{' }}{{ '}' }}") may not be used in regexes.
              </li>
              <li class="mb-2">
                <i class="pi pi-info-circle mr-2"></i>
                The following meta groups are available: <code>{{ '{' }}season:0{{ '}' }}</code>, <code>{{ '{' }}season:00{{ '}' }}</code>,
                <code>{{ '{' }}episode:0{{ '}' }}</code>, <code>{{ '{' }}episode:00{{ '}' }}</code> (with and without leading zeroes,
                respectively). The data will be taken from the search request's or title's metadata. If it's not available the
                customQueryAndTitleMapping will not be used.
              </li>
            </ul>
          </div>
        </div>
        
        <div class="form-section">
          <div class="field grid">
            <label class="col-12 md:col-3 font-medium">Affected Value</label>
            <div class="col-12 md:col-9">
              <p-select
                [(ngModel)]="model.affectedValue"
                [options]="affectedValueOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select affected value"
                class="w-full">
              </p-select>
            </div>
          </div>
          
          <div class="field grid">
            <label class="col-12 md:col-3 font-medium">Search Type</label>
            <div class="col-12 md:col-9">
              <p-select
                [(ngModel)]="model.searchType"
                [options]="searchTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select search type"
                class="w-full">
              </p-select>
            </div>
          </div>
          
          <div class="field grid">
            <label class="col-12 md:col-3 font-medium">Input pattern</label>
            <div class="col-12 md:col-9">
              <input
                type="text"
                pInputText
                [(ngModel)]="model.from"
                placeholder="Enter input pattern"
                class="w-full">
            </div>
          </div>
          
          <div class="field grid">
            <label class="col-12 md:col-3 font-medium">Output pattern</label>
            <div class="col-12 md:col-9">
              <input
                type="text"
                pInputText
                [(ngModel)]="model.to"
                placeholder="Enter output pattern"
                class="w-full">
            </div>
          </div>
          
          <div class="field grid">
            <label class="col-12 md:col-3 font-medium">Match whole string</label>
            <div class="col-12 md:col-9">
              <p-toggleSwitch [(ngModel)]="model.matchAll"></p-toggleSwitch>
            </div>
          </div>
          
          <div class="field grid">
            <label class="col-12 md:col-3 font-medium">Example query/title</label>
            <div class="col-12 md:col-9">
              <input
                type="text"
                pInputText
                [(ngModel)]="exampleInput"
                placeholder="Enter example input to test"
                class="w-full">
            </div>
          </div>
          
          <div class="field grid">
            <div class="col-12 md:col-3"></div>
            <div class="col-12 md:col-9">
              <p-button
                label="Test"
                icon="pi pi-play"
                (click)="test()"
                [loading]="testing"
                class="mr-2">
              </p-button>
            </div>
          </div>
          
          <div class="field grid" *ngIf="exampleResult !== null">
            <label class="col-12 md:col-3 font-medium">Result</label>
            <div class="col-12 md:col-9">
              <input
                type="text"
                pInputText
                [value]="exampleResult"
                readonly
                class="w-full">
            </div>
          </div>
        </div>
        
        <div class="dialog-footer flex justify-content-end gap-2 pt-4">
          <p-button
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            (click)="cancel()"
            [outlined]="true">
          </p-button>
          <p-button
            label="Submit"
            icon="pi pi-check"
            (click)="submit()">
          </p-button>
        </div>
      </div>
    `,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        ToggleSwitchModule,
        DynamicDialogModule
    ]
})
export class CustomMappingTestDialogComponent implements OnInit {
    model: CustomQueryAndTitleMapping = {
        searchType: CustomMappingSearchType.SEARCH,
        affectedValue: CustomMappingAffectedValue.QUERY,
        matchAll: true,
        from: "",
        to: ""
    };

    exampleInput = "";
    exampleResult: string | null = null;
    testing = false;

    searchTypeOptions = [
        {label: "Book", value: CustomMappingSearchType.BOOK},
        {label: "Movie", value: CustomMappingSearchType.MOVIE},
        {label: "Music", value: CustomMappingSearchType.MUSIC},
        {label: "Search", value: CustomMappingSearchType.SEARCH},
        {label: "TV Search", value: CustomMappingSearchType.TVSEARCH}
    ];

    affectedValueOptions = [
        {label: "Title", value: CustomMappingAffectedValue.TITLE},
        {label: "Query", value: CustomMappingAffectedValue.QUERY},
        {label: "Result Title", value: CustomMappingAffectedValue.RESULT_TITLE}
    ];

    constructor(
        private http: HttpClient,
        private ref: DynamicDialogRef,
        private config: DynamicDialogConfig
    ) {
    }

    ngOnInit() {
        // Get the model from dialog data
        if (this.config.data?.model) {
            this.model = {...this.config.data.model};
        }
    }

    test() {
        if (!this.exampleInput) {
            this.exampleResult = "Empty example data";
            return;
        }

        this.testing = true;
        console.log("custom mapping test");

        this.http.post<any>("/internalapi/customMapping/test", {
            mapping: this.model,
            exampleInput: this.exampleInput,
            matchAll: this.model.matchAll
        }).subscribe({
            next: (response) => {
                console.log(response);
                console.log(response.output);
                if (response.error) {
                    this.exampleResult = response.error;
                } else if (response.match) {
                    this.exampleResult = response.output;
                } else {
                    this.exampleResult = "Input does not match example";
                }
                this.testing = false;
            },
            error: (error) => {
                this.exampleResult = error.message || "An error occurred";
                this.testing = false;
            }
        });
    }

    cancel() {
        this.ref.close();
    }

    submit() {
        this.ref.close(this.model);
    }
} 