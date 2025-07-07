import {Component, OnDestroy, OnInit} from "@angular/core";
import {ReactiveFormsModule} from "@angular/forms";
import {FieldType, FieldTypeConfig, FormlyAttributes} from "@ngx-formly/core";
import {PrimeTemplate} from "primeng/api";
import {MultiSelect} from "primeng/multiselect";
import {Observable, Subscription} from "rxjs";

@Component({
    selector: "formly-field-multiselect",
    template: `
      <p-multiselect
        class="mt-[5px] flex"
        style="display: flex"
        placeholder="None selected"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [showClear]="false"
        [options]="multiselectOptions"
        [optionLabel]="'label'"
        [optionValue]="'value'"
        (onChange)="props.change && props.change(field, $event)"
      >
        <ng-template pTemplate="header">
          <div class="p-2">
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
              (click)="selectAll()">
              Select All
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
              (click)="deselectAll()">
              Deselect All
            </button>
            <div class="border-t border-gray-200 my-2"></div>
          </div>
        </ng-template>
        
        <ng-template let-marker pTemplate="item">
          <div class="flex items-center gap-2">
            {{ marker.label }}
          </div>
        </ng-template>
      </p-multiselect>
    `,
    imports: [
        FormlyAttributes,
        ReactiveFormsModule,
        MultiSelect,
        PrimeTemplate
    ]
})
export class MultiSelectFieldType extends FieldType<FieldTypeConfig> implements OnInit, OnDestroy {
    multiselectOptions: any[] = [];
    private optionsSubscription?: Subscription;

    ngOnInit() {
        this.setupOptions();
    }

    ngOnDestroy() {
        if (this.optionsSubscription) {
            this.optionsSubscription.unsubscribe();
        }
    }

    private setupOptions() {
        if (this.props.options) {
            if (this.props.options instanceof Observable) {
                this.optionsSubscription = this.props.options.subscribe(options => {
                    this.multiselectOptions = options || [];
                });
            } else {
                this.multiselectOptions = this.props.options || [];
            }
        }
    }

    selectAll() {
        const allValues = this.multiselectOptions.map(option => option.value);
        this.formControl.setValue(allValues);
    }

    deselectAll() {
        this.formControl.setValue([]);
    }
}