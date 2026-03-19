import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface WebSocketContextType {
  connected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (e) {
        console.error('Invalid WebSocket message');
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    return () => ws.close();
  }, []);

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};
