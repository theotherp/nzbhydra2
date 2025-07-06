import {Component, Input} from "@angular/core";
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
    selector: "app-category-selection-modal",
    templateUrl: "./category-selection-modal.component.html",
    styleUrls: ["./category-selection-modal.component.scss"],
    standalone: false
})
export class CategorySelectionModalComponent {
    @Input() categories: string[] = [];

    constructor(public activeModal: NgbActiveModal) {
    }

    selectCategory(category: string) {
        this.activeModal.close(category);
    }


    cancel() {
        this.activeModal.dismiss("cancel");
    }
} 