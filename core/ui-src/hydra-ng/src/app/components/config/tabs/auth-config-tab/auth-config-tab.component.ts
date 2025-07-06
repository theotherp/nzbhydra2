import {Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "app-auth-config-tab",
    template: `
      <div class="auth-config-tab">
        <div class="alert alert-info">
          <h4>Authorization Configuration</h4>
          <p>This tab will contain authentication and authorization settings.</p>
          <p>Advanced mode: {{ showAdvanced ? 'Enabled' : 'Disabled' }}</p>
        </div>
      </div>
    `,
    standalone: false
})
export class AuthConfigTabComponent {
    @Input() showAdvanced = false;
    @Output() dirtyChange = new EventEmitter<boolean>();
    @Output() validChange = new EventEmitter<boolean>();
} 