import {Injectable} from "@angular/core";
import {Subject} from "rxjs";
import {SearchState} from "../components/search-status-modal/search-status-modal.component";
import SockJS from 'sockjs-client/dist/sockjs';
import {Client, Message} from '@stomp/stompjs';

@Injectable({
    providedIn: "root"
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private searchStateSubject = new Subject<SearchState>();
  private isConnected = false;

  searchState$ = this.searchStateSubject.asObservable();

  connect(baseUrl: string): void {
    if (this.isConnected) {
      console.log("WebSocket already connected");
      return;
    }

    console.log("Connecting to WebSocket at:", baseUrl + '/websocket');
    
    // Create SockJS connection with retry options
    const socket = new SockJS(baseUrl + '/websocket', null, {
      timeout: 5000,
      transports: ['websocket', 'xhr-streaming', 'xhr-polling']
    });
    
    // Create STOMP client
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    // Connect to the WebSocket
    this.stompClient.onConnect = (frame) => {
      console.log('Connected to WebSocket:', frame);
      this.isConnected = true;
      
      // Subscribe to search state updates
      this.stompClient!.subscribe('/topic/searchState', (message: Message) => {
        try {
          const data = JSON.parse(message.body);
          console.log('Received search state update:', data);
          this.searchStateSubject.next(data);
        } catch (error) {
          console.error('Error parsing search state message:', error);
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('STOMP error:', frame);
      this.isConnected = false;
      // Retry connection after a delay
      setTimeout(() => {
        if (!this.isConnected) {
          console.log('Retrying WebSocket connection...');
          this.connect(baseUrl);
        }
      }, 3000);
    };

    this.stompClient.onWebSocketError = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
      // Retry connection after a delay
      setTimeout(() => {
        if (!this.isConnected) {
          console.log('Retrying WebSocket connection...');
          this.connect(baseUrl);
        }
      }, 3000);
    };

    this.stompClient.onWebSocketClose = () => {
      console.log('WebSocket connection closed');
      this.isConnected = false;
    };

    // Activate the connection
    this.stompClient.activate();
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