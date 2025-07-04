import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";

@Component({
    selector: "app-config",
    templateUrl: "./config.component.html",
    styleUrls: ["./config.component.css"],
    standalone: false
})
export class ConfigComponent implements OnInit {
    activeTab = 0;

    constructor(private route: ActivatedRoute) {
    }

    ngOnInit() {
        // Determine active tab based on route
        const url = this.route.snapshot.url;
        if (url.length > 1) {
            const tab = url[1].path;
            switch (tab) {
                case "main":
                    this.activeTab = 0;
                    break;
                case "auth":
                    this.activeTab = 1;
                    break;
                case "searching":
                    this.activeTab = 2;
                    break;
                case "categories":
                    this.activeTab = 3;
                    break;
                case "downloading":
                    this.activeTab = 4;
                    break;
                case "indexers":
                    this.activeTab = 5;
                    break;
                case "notifications":
                    this.activeTab = 6;
                    break;
            }
        }
    }
} 