import {Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "app-categories-config-tab",
    template: `
      <div class="categories-config-tab">
        <div class="alert alert-info">
          <h4>Categories Configuration</h4>
          <p>This tab will contain category definitions and mappings.</p>
          <p>Advanced mode: {{ showAdvanced ? 'Enabled' : 'Disabled' }}</p>
        </div>
      </div>
    `,
    standalone: false
})
export class CategoriesConfigTabComponent {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
} 