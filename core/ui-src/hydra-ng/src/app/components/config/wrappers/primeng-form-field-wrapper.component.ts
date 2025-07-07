import {Component} from "@angular/core";
import {FieldWrapper} from "@ngx-formly/core";

@Component({
    selector: "formly-wrapper-primeng-form-field",
    template: `
      <div class="p-field">
        <label *ngIf="props.label && props['hideLabel'] !== true" [for]="id">
          {{ props.label }}
          <span *ngIf="props.required && props['hideRequiredMarker'] !== true" aria-hidden="true">*</span>
        </label>
        <ng-container #fieldComponent></ng-container>
        <small *ngIf="showError" class="p-error">
          <formly-validation-message class="ui-message-text" [field]="field"></formly-validation-message>
        </small>
      </div>
    `,
    standalone: false
})
export class PrimengFormFieldWrapperComponent extends FieldWrapper {
    override get showError(): boolean {
        return !!(this.formControl?.invalid && (this.formControl?.dirty || this.field?.formControl?.touched));
    }
} 