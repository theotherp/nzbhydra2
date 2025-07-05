import {Injectable} from "@angular/core";
import {Subject} from "rxjs";
import {SearchState} from "../components/search-status-modal/search-status-modal.component";

@Injectable({
    providedIn: "root"
})
export class WebSocketService {
    private socket: WebSocket | null = null;
    private stompClient: any = null;
    private searchStateSubject = new Subject<SearchState>();

    searchState$ = this.searchStateSubject.asObservable();

    connect(baseUrl: string): void {
        // Note: In a real implementation, you would need to include SockJS and Stomp libraries
        // For now, this is a placeholder that would need to be implemented with actual WebSocket libraries
        console.log("WebSocket connection would be established here");

        // Mock implementation for demonstration
        // In reality, you would use:
        // const socket = new SockJS(baseUrl + 'websocket');
        // this.stompClient = Stomp.over(socket);
        // this.stompClient.connect({}, () => {
        //   this.stompClient.subscribe('/topic/searchState', (message: any) => {
        //     const data = JSON.parse(message.body);
        //     this.searchStateSubject.next(data);
        //   });
        // });
    }

    disconnect(): void {
        if (this.stompClient) {
            this.stompClient.disconnect();
        }
        if (this.socket) {
            this.socket.close();
        }
    }

    // Mock method to simulate search state updates for testing
    simulateSearchStateUpdate(searchRequestId: number): void {
        const mockStates: SearchState[] = [
            {
                searchRequestId,
                indexerSelectionFinished: false,
                searchFinished: false,
                indexersSelected: 0,
                indexersFinished: 0,
                messages: []
            },
            {
                searchRequestId,
                indexerSelectionFinished: true,
                searchFinished: false,
                indexersSelected: 2,
                indexersFinished: 0,
                messages: [
                    {
                        message: "Not using Mock3 because the search source is INTERNAL but the indexer is only enabled for API searches",
                        messageSortValue: "Not using Mock3 because the search source is INTERNAL but the indexer is only enabled for API searches"
                    }
                ]
            },
            {
                searchRequestId,
                indexerSelectionFinished: true,
                searchFinished: false,
                indexersSelected: 2,
                indexersFinished: 1,
                messages: [
                    {
                        message: "Not using Mock3 because the search source is INTERNAL but the indexer is only enabled for API searches",
                        messageSortValue: "Not using Mock3 because the search source is INTERNAL but the indexer is only enabled for API searches"
                    },
                    {
                        message: "Indexer1: 150 results found",
                        messageSortValue: "Indexer1: 150 results found"
                    }
                ]
            },
            {
                searchRequestId,
                indexerSelectionFinished: true,
                searchFinished: true,
                indexersSelected: 2,
                indexersFinished: 2,
                messages: [
                    {
                        message: "Not using Mock3 because the search source is INTERNAL but the indexer is only enabled for API searches",
                        messageSortValue: "Not using Mock3 because the search source is INTERNAL but the indexer is only enabled for API searches"
                    },
                    {
                        message: "Indexer1: 150 results found",
                        messageSortValue: "Indexer1: 150 results found"
                    },
                    {
                        message: "Indexer2: 75 results found",
                        messageSortValue: "Indexer2: 75 results found"
                    }
                ]
            }
        ];

        let stateIndex = 0;
        const interval = setInterval(() => {
            if (stateIndex < mockStates.length) {
                this.searchStateSubject.next(mockStates[stateIndex]);
                stateIndex++;
            } else {
                clearInterval(interval);
            }
        }, 2000);
    }
} 