import {CommonModule} from "@angular/common";
import {Component} from "@angular/core";
import {FieldArrayType, FormlyField} from "@ngx-formly/core";
import {ButtonDirective, ButtonIcon} from "primeng/button";

@Component({
    selector: "formly-repeat-section",
    standalone: true,
    imports: [CommonModule, FormlyField, ButtonDirective, ButtonIcon],
    template: `
      <div *ngIf="!shouldHide()">
        <div *ngFor="let field of field.fieldGroup; let i = index;" class="mb-4 border-b pb-4">
          <formly-field [field]="field"></formly-field>
          <button type="button" pButton pButtonIcon="pi pi-trash" class="p-button-danger mt-2" (click)="remove(i)">Remove</button>
        </div>
        <button type="button" pButton pButtonIcon="pi pi-plus" class="p-button-success" (click)="add()">Add User</button>
      </div>
    `
})
export class RepeatTypeComponent extends FieldArrayType {
    shouldHide(): boolean {
        return eval(this.props["hideWhen"]);
    }
} 