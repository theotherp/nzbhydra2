import {CommonModule} from "@angular/common";
import {Component} from "@angular/core";
import {FieldArrayType, FormlyField} from "@ngx-formly/core";
import {ButtonDirective, ButtonIcon} from "primeng/button";
import {Card} from "primeng/card";

@Component({
    selector: "formly-repeat-section",
    standalone: true,
    imports: [CommonModule, FormlyField, ButtonDirective, ButtonIcon, Card],
    template: `
      <div *ngIf="!shouldHide()" class="mb-4">
        <p-card [header]="getHeader()" styleClass="shadow-1">
          <div class="space-y-4">
            <div *ngFor="let field of field.fieldGroup; let i = index;" class="p-4 border rounded-lg bg-gray-50">
              <formly-field [field]="field"></formly-field>
              <div class="mt-3 flex justify-end">
                <button type="button" pButton pButtonIcon="pi pi-trash"
                        class="p-button-danger p-button-sm"
                        (click)="remove(i)">
                  Remove
                </button>
              </div>
            </div>
            
            <div class="flex justify-center pt-2">
              <button type="button" pButton pButtonIcon="pi pi-plus"
                      class="p-button-success"
                      (click)="add()">
                Add {{ getAddButtonText() }}
              </button>
            </div>
          </div>
        </p-card>
      </div>
    `
})
export class RepeatTypeComponent extends FieldArrayType {
    shouldHide(): boolean {
        return eval(this.props["hideWhen"]);
    }

    getHeader(): string {
        return this.props["label"] || "Items";
    }

    getAddButtonText(): string {
        return this.props["addButtonText"] || "Item";
    }
} 