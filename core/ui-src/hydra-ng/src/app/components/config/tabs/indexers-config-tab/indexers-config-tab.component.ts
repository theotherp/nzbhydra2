import {Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "app-indexers-config-tab",
    template: `
      <div class="indexers-config-tab">
        <div class="alert alert-info">
          <h4>Indexers Configuration</h4>
          <p>This tab will contain indexer management and settings.</p>
          <p>Advanced mode: {{ showAdvanced ? 'Enabled' : 'Disabled' }}</p>
        </div>
      </div>
    `,
    standalone: false
})
export class IndexersConfigTabComponent {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
} 