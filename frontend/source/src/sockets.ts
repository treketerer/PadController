import { toast } from "sonner";
import { WS_URL } from "./config";

export type SocketMessage = {
    "event": string,
    "data"?: any
}

type EventCallback = (data: any) => void;

class SocketService{
    private socket: WebSocket | null = null;
    private userId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    private callbacks: Map<string, EventCallback> = new Map();

    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private tryingReconnect = false;
    
    connect() {
        if (
            this.socket?.readyState === WebSocket.OPEN ||
            this.socket?.readyState === WebSocket.CONNECTING
        ) {
            return;
        }

        this.socket = new WebSocket(`${WS_URL}/ws/${this.userId}`);
        
        this.socket.onopen = () => {
            console.log("WebSocket подключён");
            this.emit("connected", {});
            if (this.tryingReconnect){
                toast.success("Переподключение выполнено!")
            }
            this.tryingReconnect = false
        };

        this.socket.onclose = () => {
            console.log("WebSocket отключён");
            this.socket = null;
            toast.warning("Пытаемся переподключиться к серверу")
            
            this.tryingReconnect = true
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.connect();
            }, 3000);
        };

        this.socket.onmessage = (message) => {
            try {
                const parsed: SocketMessage = JSON.parse(message.data);

                this.emit(parsed.event, parsed.data);
            } catch (error) {
                console.error("Ошибка обработки WebSocket:", error);
            }
        };
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.socket?.close();
        this.socket = null;
    }

    on(event: string, callback: EventCallback){
        this.callbacks.set(event, callback);
    }

    off(event: string){
        const value = this.callbacks.get(event)
        if (value){
            this.callbacks.delete(event);   
        }
    }

    send(event: string, data: any){
        if (this.socket?.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket не подключён. Событие не отправлено:", event);
            return false;
        }

        console.log(event, data)

        this.socket?.send(JSON.stringify(
            {event, data}
        ))
    }

    emit(event: string, data: any){
        const eventCallbacks = this.callbacks.get(event);
        
        if (eventCallbacks){
            eventCallbacks(data);
        }
    }
}

export const socketService = new SocketService();