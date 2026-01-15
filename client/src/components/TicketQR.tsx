import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Ticket } from '@shared/types';

interface TicketQRProps {
  ticket: Ticket;
}

export function TicketQR({ ticket }: TicketQRProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const payload = JSON.stringify({
      ticketId: ticket.id,
      restaurantId: ticket.restaurantId,
      cornerId: ticket.cornerId,
      createdAt: ticket.createdAt,
      activatedAt: ticket.activatedAt,
      nonce: Math.random().toString(36).substr(2, 8),
    });

    QRCode.toDataURL(payload, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [ticket]);

  if (!qrDataUrl) {
    return (
      <div className="w-[200px] h-[200px] bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">QR 생성 중...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm" data-testid="qr-code">
      <img 
        src={qrDataUrl} 
        alt="주문권 QR 코드" 
        className="w-[200px] h-[200px]"
      />
    </div>
  );
}
