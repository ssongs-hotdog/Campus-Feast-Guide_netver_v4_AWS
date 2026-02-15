import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Ticket, TicketStatus, MenuItem } from '@shared/types';
import { useToast } from '@/hooks/use-toast';

interface TicketContextValue {
  tickets: Ticket[];
  history: Ticket[];
  balance: number;
  chargeBalance: (amount: number) => void;
  purchaseTicket: (menu: MenuItem, paymentMethod: string) => boolean;
  cancelTicket: (ticketId: string) => { success: boolean; message: string };
  activateTicket: (ticketId: string) => void;
  markUsed: (ticketId: string) => void;
  remainingSeconds: (ticketId: string) => number;
}

const TicketContext = createContext<TicketContextValue | null>(null);

const TICKET_VALIDITY_MINUTES = 30; // Time to use QR after activation
const CANCELLATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEYS = {
  TICKETS: 'h-eat-tickets-v2',
  HISTORY: 'h-eat-history-v2',
  BALANCE: 'h-eat-balance-v2',
};

function generateTicketId(): string {
  return `TK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  // -- State Initialization --
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(STORAGE_KEYS.BALANCE) || '0', 10);
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TICKETS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [history, setHistory] = useState<Ticket[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // -- Persistence Effects --
  useEffect(() => localStorage.setItem(STORAGE_KEYS.BALANCE, balance.toString()), [balance]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets)), [tickets]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)), [history]);

  // -- Expiry Check (Auto-expire active tickets) --
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTickets(prev => prev.map(t => {
        if (t.status === 'active' && t.expiresAt && t.expiresAt < now) {
          return { ...t, status: 'expired' };
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // -- Actions --

  const chargeBalance = useCallback((amount: number) => {
    setBalance(prev => prev + amount);
    toast({ title: '충전 완료', description: `${amount.toLocaleString()}원이 충전되었습니다.` });
  }, [toast]);

  const purchaseTicket = useCallback((menu: MenuItem, paymentMethod: string) => {
    if (paymentMethod === '충전액 결제' && balance < menu.priceWon) {
      toast({ title: '잔액 부족', description: '충전 잔액이 부족합니다.', variant: 'destructive' });
      return false;
    }

    if (paymentMethod === '충전액 결제') {
      setBalance(prev => prev - menu.priceWon);
    }

    const newTicket: Ticket = {
      id: generateTicketId(),
      restaurantId: menu.restaurantId,
      cornerId: menu.cornerId,
      menuName: menu.mainMenuName,
      priceWon: menu.priceWon,
      status: 'stored',
      createdAt: Date.now(),
      // paymentMethod can be added to type if needed
    };

    setTickets(prev => [newTicket, ...prev]);
    toast({ title: '식권 구매 완료', description: '내 식권함에서 확인하세요.' });
    return true;
  }, [balance, toast]);

  const cancelTicket = useCallback((ticketId: string) => {
    let result = { success: false, message: '' };

    setTickets(prev => {
      const target = prev.find(t => t.id === ticketId);
      if (!target) {
        result = { success: false, message: 'Ticket not found' };
        return prev;
      }

      if (target.status !== 'stored') {
        result = { success: false, message: '이미 사용했거나 만료된 식권은 취소할 수 없습니다.' };
        return prev;
      }

      const timeDiff = Date.now() - target.createdAt;
      if (timeDiff > CANCELLATION_WINDOW_MS) {
        result = { success: false, message: '구매 후 5분이 지나 취소할 수 없습니다.' };
        return prev;
      }

      // Restore Balance
      setBalance(b => b + target.priceWon);

      // Remove from tickets, could move to 'cancelled' history if needed, 
      // but "Cancellation policy... allow cancellation ONLY when unused" usually implies refund.
      // We will remove it from active list. 
      // Optionally add to history as 'cancelled' type if the type supports it. 
      // For now, just remove.
      result = { success: true, message: '식권 구매가 취소되었습니다. (환불 완료)' };
      return prev.filter(t => t.id !== ticketId);
    });

    if (result.success) toast({ title: '취소 완료', description: result.message });
    else toast({ title: '취소 실패', description: result.message, variant: 'destructive' });

    return result;
  }, [toast]);

  const activateTicket = useCallback((ticketId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const now = Date.now();
      return {
        ...t,
        status: 'active',
        activatedAt: now,
        expiresAt: now + TICKET_VALIDITY_MINUTES * 60 * 1000,
      };
    }));
  }, []);

  const markUsed = useCallback((ticketId: string) => {
    setTickets(prev => {
      const target = prev.find(t => t.id === ticketId);
      if (target) {
        setHistory(h => [{ ...target, status: 'used', activatedAt: target.activatedAt || Date.now() }, ...h]);
      }
      return prev.filter(t => t.id !== ticketId);
    });
    toast({ title: '사용 완료', description: '맛있는 식사 되세요!' });
  }, [toast]);

  const remainingSeconds = useCallback((ticketId: string) => {
    const t = tickets.find(ticket => ticket.id === ticketId);
    if (!t || t.status !== 'active' || !t.expiresAt) return 0;
    return Math.max(0, Math.floor((t.expiresAt - Date.now()) / 1000));
  }, [tickets]);

  return (
    <TicketContext.Provider
      value={{
        tickets,
        history,
        balance,
        chargeBalance,
        purchaseTicket,
        cancelTicket,
        activateTicket,
        markUsed,
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

