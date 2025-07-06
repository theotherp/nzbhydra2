import {Component, OnDestroy, OnInit} from "@angular/core";
import {ReactiveFormsModule} from "@angular/forms";
import {FieldType, FieldTypeConfig, FormlyAttributes} from "@ngx-formly/core";
import {AutoComplete} from "primeng/autocomplete";

@Component({
    selector: "formly-field-chips-input",
    template: `
      <p-autocomplete
        [formControl]="formControl"
        [formlyAttributes]="field"
        [placeholder]="props.placeholder || 'Enter values...'"
        multiple
        [typeahead]="false"
        [showClear]="false"
        class="w-full">
      </p-autocomplete>
    `,
    imports: [
        FormlyAttributes,
        ReactiveFormsModule,
        AutoComplete
    ]
})
export class ChipsInputFieldType extends FieldType<FieldTypeConfig> implements OnInit, OnDestroy {
    ngOnInit() {
        // Component initialization
    }

    ngOnDestroy() {
        // Cleanup if needed
    }
} 