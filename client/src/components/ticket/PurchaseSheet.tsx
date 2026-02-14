import { useState } from 'react';
import { useLocation } from 'wouter';
import { useTicketContext } from '@/lib/ticketContext';
import { MenuItem, formatPrice } from '@shared/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PurchaseSheetProps {
    isOpen: boolean;
    onClose: () => void;
    menu: MenuItem | null;
}

export function PurchaseSheet({ isOpen, onClose, menu }: PurchaseSheetProps) {
    const [, setLocation] = useLocation();
    const { purchaseTicket, balance } = useTicketContext();
    const { toast } = useToast();
    const [paymentMethod, setPaymentMethod] = useState('charge'); // 'charge', 'toss', 'card'

    if (!menu) return null;

    const handlePurchase = () => {
        const methodLabel = paymentMethod === 'charge' ? '충전액 결제' : '기타 결제';

        // Simulate other payment methods being "Coming Soon" or disabled in logic, 
        // but Requirement says "Show (UI only / disabled or Coming soon)".
        // Let's actually allow clicking them but maybe block purchase or just simulate it?
        // Requirement: "Default: '충전액 결제'. Also show... '토스페이', '카드결제'"
        // "Do NOT force top-up as the only visible option."

        // Logic for 'charge'
        if (paymentMethod === 'charge') {
            const success = purchaseTicket(menu, '충전액 결제');
            if (success) {
                onClose();
                setLocation('/ticket');
            }
        } else {
            // For other methods, simulation
            toast({
                title: "준비 중입니다",
                description: "현재는 충전액 결제만 가능합니다.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>주문 결제</DialogTitle>
                    <DialogDescription>
                        결제 수단을 선택해주세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="font-bold text-lg mb-1">{menu.mainMenuName}</h3>
                        <p className="text-sm text-gray-500 mb-2">{formatPrice(menu.priceWon)}</p>
                    </div>

                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-3">

                        {/* 1. Charge Balance (Default) */}
                        <div className={`flex items-center justify-between space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'charge' ? 'border-[#0E4A84] bg-blue-50/50' : 'border-gray-200'}`}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="charge" id="charge" />
                                <Label htmlFor="charge" className="flex items-center cursor-pointer font-medium">
                                    <Wallet className="w-4 h-4 mr-2 text-[#0E4A84]" />
                                    충전액 결제
                                </Label>
                            </div>
                            <span className="text-sm text-gray-500">
                                잔액: {balance.toLocaleString()}원
                            </span>
                        </div>

                        {/* 2. Toss Pay */}
                        <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-not-allowed opacity-60 ${paymentMethod === 'toss' ? 'border-gray-300' : 'border-gray-200'}`}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="toss" id="toss" disabled />
                                <Label htmlFor="toss" className="flex items-center cursor-not-allowed font-medium text-gray-400">
                                    <div className="w-4 h-4 mr-2 bg-gray-300 rounded-full" />
                                    토스페이
                                </Label>
                            </div>
                            <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">준비중</span>
                        </div>

                        {/* 3. Card */}
                        <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-not-allowed opacity-60 ${paymentMethod === 'card' ? 'border-gray-300' : 'border-gray-200'}`}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="card" id="card" disabled />
                                <Label htmlFor="card" className="flex items-center cursor-not-allowed font-medium text-gray-400">
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    카드 결제
                                </Label>
                            </div>
                            <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">준비중</span>
                        </div>

                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
                    <Button
                        onClick={handlePurchase}
                        className="flex-1 bg-[#0E4A84] hover:bg-[#0b3d6e]"
                        disabled={paymentMethod !== 'charge'}
                    >
                        {formatPrice(menu.priceWon)} 결제하기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
