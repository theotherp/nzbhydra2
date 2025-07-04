import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";

@Component({
    selector: "app-system",
    templateUrl: "./system.component.html",
    styleUrls: ["./system.component.css"],
    standalone: false
})
export class SystemComponent implements OnInit {
    activeTab = 0;

    constructor(private route: ActivatedRoute) {
    }

    ngOnInit() {
        // Determine active tab based on route
        const url = this.route.snapshot.url;
        if (url.length > 1) {
            const tab = url[1].path;
            switch (tab) {
                case "control":
                    this.activeTab = 0;
                    break;
                case "updates":
                    this.activeTab = 1;
                    break;
                case "log":
                    this.activeTab = 2;
                    break;
                case "tasks":
                    this.activeTab = 3;
                    break;
                case "backup":
                    this.activeTab = 4;
                    break;
                case "bugreport":
                    this.activeTab = 5;
                    break;
                case "news":
                    this.activeTab = 6;
                    break;
                case "about":
                    this.activeTab = 7;
                    break;
            }
        }
    }
} 