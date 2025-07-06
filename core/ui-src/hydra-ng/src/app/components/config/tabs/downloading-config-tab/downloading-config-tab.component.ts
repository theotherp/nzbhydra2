import {Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "app-downloading-config-tab",
    template: `
      <div class="downloading-config-tab">
        <div class="alert alert-info">
          <h4>Download Configuration</h4>
          <p>This tab will contain download client configuration.</p>
          <p>Advanced mode: {{ showAdvanced ? 'Enabled' : 'Disabled' }}</p>
        </div>
      </div>
    `,
    standalone: false
})
export class DownloadingConfigTabComponent {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
} 