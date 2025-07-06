import {Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "app-notifications-config-tab",
    template: `
      <div class="notifications-config-tab">
        <div class="alert alert-info">
          <h4>Notifications Configuration</h4>
          <p>This tab will contain notification settings.</p>
          <p>Advanced mode: {{ showAdvanced ? 'Enabled' : 'Disabled' }}</p>
        </div>
      </div>
    `,
    standalone: false
})
export class NotificationsConfigTabComponent {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
} 