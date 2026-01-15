import { useLocation } from 'wouter';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketQR } from '@/components/TicketQR';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatPrice } from '@shared/types';

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TicketPage() {
  const [, setLocation] = useLocation();
  const { ticket, activateTicket, markUsed, clearTicket, remainingSeconds } = useTicketContext();

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-base font-semibold text-foreground">주문권</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">주문권이 없습니다</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setLocation('/')}
          >
            식당 보기
          </Button>
        </main>
      </div>
    );
  }

  const restaurant = RESTAURANTS.find((r) => r.id === ticket.restaurantId);

  const statusConfig = {
    stored: {
      label: '보관 중',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: Clock,
    },
    active: {
      label: '사용 가능',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: CheckCircle,
    },
    used: {
      label: '사용 완료',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      icon: CheckCircle,
    },
    expired: {
      label: '만료됨',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: XCircle,
    },
  };

  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground">주문권</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <Card className="p-6" data-testid="card-ticket">
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${status.color} gap-1`} data-testid="badge-ticket-status">
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid="text-ticket-id">
              {ticket.id}
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1" data-testid="text-ticket-menu">
              {ticket.menuName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {restaurant?.name}
            </p>
            <p className="text-lg font-semibold text-primary mt-2" data-testid="text-ticket-price">
              {formatPrice(ticket.priceWon)}
            </p>
          </div>

          {ticket.status === 'active' && (
            <div className="flex flex-col items-center mb-6">
              <TicketQR ticket={ticket} />
              <div className="mt-4 flex items-center gap-2">
                {remainingSeconds <= 300 && remainingSeconds > 0 && (
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                )}
                <p 
                  className={`text-2xl font-mono font-bold ${
                    remainingSeconds <= 300 ? 'text-orange-500' : 'text-foreground'
                  }`}
                  data-testid="text-countdown"
                >
                  {formatCountdown(remainingSeconds)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                남은 유효시간 (실제 시간 기준)
              </p>
            </div>
          )}

          {ticket.status === 'stored' && (
            <div className="text-center mb-6 py-8 bg-muted/50 rounded-lg">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                활성화하면 QR 코드가 생성됩니다
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                유효시간: 30분
              </p>
            </div>
          )}

          {ticket.status === 'used' && (
            <div className="text-center mb-6 py-8 bg-muted/50 rounded-lg">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">
                식사 완료
              </p>
            </div>
          )}

          {ticket.status === 'expired' && (
            <div className="text-center mb-6 py-8 bg-muted/50 rounded-lg">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">
                주문권이 만료되었습니다
              </p>
            </div>
          )}

          <div className="space-y-2">
            {ticket.status === 'stored' && (
              <Button 
                className="w-full"
                onClick={activateTicket}
                data-testid="button-activate"
              >
                수령 시작 (활성화)
              </Button>
            )}

            {ticket.status === 'active' && (
              <Button 
                className="w-full"
                onClick={markUsed}
                data-testid="button-mark-used"
              >
                사용 완료
              </Button>
            )}

            {(ticket.status === 'used' || ticket.status === 'expired') && (
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => {
                  clearTicket();
                  setLocation('/');
                }}
                data-testid="button-clear-ticket"
              >
                새 주문하기
              </Button>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          QR 코드를 직원에게 보여주세요
        </p>
      </main>
    </div>
  );
}
