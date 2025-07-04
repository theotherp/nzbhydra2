import {Component} from "@angular/core";

@Component({
    selector: "app-root",
    templateUrl: "./app.html",
    standalone: false,
    styleUrl: "./app.css"
})
export class App {
    protected title = "NZBHydra2";

    // Navigation properties (will be populated from service)
    showSearch = true;
    showStats = true;
    showAdmin = true;
    showLoginout = true;
    keepHistory = true;
    loginlogoutText = "Logout";

    loginout() {
        // TODO: Implement login/logout functionality
        console.log("Login/logout clicked");
    }
}
