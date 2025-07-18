import {Component} from "@angular/core";
import {FieldWrapper} from "@ngx-formly/core";

@Component({
    selector: "formly-advanced-wrapper",
    template: `
      <div *ngIf="showAdvanced">
        <ng-container #fieldComponent></ng-container>
      </div>
    `,
    standalone: false
})
export class AdvancedWrapperComponent extends FieldWrapper {
    get showAdvanced(): boolean {
        return this.props["showAdvanced"] || false;
    }
} 