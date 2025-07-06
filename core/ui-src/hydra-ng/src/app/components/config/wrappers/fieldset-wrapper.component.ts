import {Component} from "@angular/core";
import {FieldWrapper} from "@ngx-formly/core";

@Component({
    selector: "formly-wrapper-fieldset",
    template: `
        <div class="card mb-3">
            <div class="card-header" *ngIf="to.label">
                <h6 class="mb-0">{{ to.label }}</h6>
            </div>
            <div class="card-body">
                <ng-container #fieldComponent></ng-container>
            </div>
        </div>
    `,
    standalone: false
})
export class FieldsetWrapperComponent extends FieldWrapper {
} 