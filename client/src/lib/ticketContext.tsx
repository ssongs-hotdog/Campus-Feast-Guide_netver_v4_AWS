import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Ticket, TicketStatus } from '@shared/types';

interface TicketContextValue {
  ticket: Ticket | null;
  createTicket: (restaurantId: string, cornerId: string, menuName: string, priceWon: number) => void;
  activateTicket: () => void;
  markUsed: () => void;
  clearTicket: () => void;
  remainingSeconds: number;
}

const TicketContext = createContext<TicketContextValue | null>(null);

const TICKET_VALIDITY_MINUTES = 30;
const TICKET_STORAGE_KEY = 'h-eat-ticket';

function generateTicketId(): string {
  return `TK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [ticket, setTicket] = useState<Ticket | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(TICKET_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.status === 'active' && parsed.expiresAt && parsed.expiresAt < Date.now()) {
          return { ...parsed, status: 'expired' as TicketStatus };
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (ticket) {
      localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(ticket));
    } else {
      localStorage.removeItem(TICKET_STORAGE_KEY);
    }
  }, [ticket]);

  useEffect(() => {
    if (!ticket || ticket.status !== 'active' || !ticket.expiresAt) {
      if (ticket?.status !== 'active') {
        setRemainingSeconds(0);
      }
      return;
    }

    const updateRemaining = () => {
      if (!ticket.expiresAt) return;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((ticket.expiresAt - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0 && ticket.status === 'active') {
        setTicket((prev) => {
          if (prev && prev.status === 'active') {
            return { ...prev, status: 'expired' };
          }
          return prev;
        });
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [ticket?.status, ticket?.expiresAt]);

  const createTicket = useCallback(
    (restaurantId: string, cornerId: string, menuName: string, priceWon: number) => {
      const newTicket: Ticket = {
        id: generateTicketId(),
        restaurantId,
        cornerId,
        menuName,
        priceWon,
        status: 'stored',
        createdAt: Date.now(),
      };
      setTicket(newTicket);
    },
    []
  );

  const activateTicket = useCallback(() => {
    setTicket((prev) => {
      if (!prev || prev.status !== 'stored') return prev;
      const now = Date.now();
      return {
        ...prev,
        status: 'active',
        activatedAt: now,
        expiresAt: now + TICKET_VALIDITY_MINUTES * 60 * 1000,
      };
    });
  }, []);

  const markUsed = useCallback(() => {
    setTicket((prev) => {
      if (!prev || prev.status !== 'active') return prev;
      return { ...prev, status: 'used' };
    });
  }, []);

  const clearTicket = useCallback(() => {
    setTicket(null);
  }, []);

  return (
    <TicketContext.Provider
      value={{
        ticket,
        createTicket,
        activateTicket,
        markUsed,
        clearTicket,
        remainingSeconds,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

export function useTicketContext() {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTicketContext must be used within TicketProvider');
  }
  return context;
}
