const hostname = window.location.hostname;
const port = "8000"; // или ваш порт бэкенда

// Базовый HTTP URL
export const API_URL = `http://${hostname}:${port}`;

// Удобный WebSocket URL (автоматически меняет http на ws)
export const WS_URL = API_URL.replace(/^http/, "ws");