import {Injectable} from "@angular/core";
import {Client, Message} from "@stomp/stompjs";
import {Subject} from "rxjs";
import SockJS from "sockjs-client/dist/sockjs";
import {SearchState} from "../components/search-status-modal/search-status-modal.component";

@Injectable({
    providedIn: "root"
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private searchStateSubject = new Subject<SearchState>();
  private isConnected = false;
  private connectionPromise: Promise<boolean> | null = null;

  searchState$ = this.searchStateSubject.asObservable();

  connect(baseUrl: string): Promise<boolean> {
    if (this.isConnected) {
      console.log("WebSocket already connected");
      return Promise.resolve(true);
    }

    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    console.log("Connecting to WebSocket at:", baseUrl + '/websocket');

    this.connectionPromise = new Promise<boolean>((resolve, reject) => {
      // Create SockJS connection with retry options
      const socket = new SockJS(baseUrl + "/websocket", null, {
        timeout: 5000,
        transports: ["websocket", "xhr-streaming", "xhr-polling"]
      });

      // Create STOMP client
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str) => {
          console.log("STOMP Debug:", str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000
      });

      // Connect to the WebSocket
      this.stompClient.onConnect = (frame) => {
        console.log("Connected to WebSocket:", frame);
        this.isConnected = true;
        this.connectionPromise = null;

        // Subscribe to search state updates
        this.stompClient!.subscribe("/topic/searchState", (message: Message) => {
          try {
            const data = JSON.parse(message.body);
            console.log("Received search state update:", data);
            this.searchStateSubject.next(data);
          } catch (error) {
            console.error("Error parsing search state message:", error);
          }
        });

        console.log("WebSocket connection established and subscription active");
        resolve(true);
      };

      this.stompClient.onStompError = (frame) => {
        console.error("STOMP error:", frame);
        this.isConnected = false;
        this.connectionPromise = null;
        reject(new Error("STOMP connection failed"));
      };

      this.stompClient.onWebSocketError = (error) => {
        console.error("WebSocket error:", error);
        this.isConnected = false;
        this.connectionPromise = null;
        reject(new Error("WebSocket connection failed"));
      };

      this.stompClient.onWebSocketClose = () => {
        console.log("WebSocket connection closed");
        this.isConnected = false;
        this.connectionPromise = null;
      };

      // Activate the connection
      this.stompClient.activate();
    });

    return this.connectionPromise;
  }

      disconnect(): void {
    if (this.stompClient && this.isConnected) {
      this.stompClient.deactivate();
      this.isConnected = false;
    }
  }

      // Method to check if WebSocket is connected
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  // Method to wait for WebSocket to be ready
  waitForConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }

      // Wait up to 10 seconds for connection
      let attempts = 0;
      const maxAttempts = 20;
      const checkConnection = () => {
        attempts++;
        if (this.isConnected) {
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.warn('WebSocket connection timeout');
          resolve(false);
        } else {
          setTimeout(checkConnection, 500);
        }
      };
      checkConnection();
    });
  }
} 