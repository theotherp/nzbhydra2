import {Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "app-searching-config-tab",
    template: `
      <div class="searching-config-tab">
        <div class="alert alert-info">
          <h4>Search Configuration</h4>
          <p>This tab will contain search behavior and limits settings.</p>
          <p>Advanced mode: {{ showAdvanced ? 'Enabled' : 'Disabled' }}</p>
        </div>
      </div>
    `,
    standalone: false
})
export class SearchingConfigTabComponent {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
} 