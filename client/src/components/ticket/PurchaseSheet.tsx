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
    const [paymentMethod, setPaymentMethod] = useState('charge'); // 'charge', 'kakao', 'toss'

    if (!menu) return null;

    const handlePurchase = async () => {
        // Method 1: Charge Balance (Internal Logic)
        if (paymentMethod === 'charge') {
            const success = purchaseTicket(menu, '충전액 결제');
            if (success) {
                onClose();
                setLocation('/ticket');
            }
            return;
        }

        // Method 2: PortOne Mock Payment (Kakao / Toss)
        // Ensure PortOne SDK is loaded
        if (!window.PortOne) {
            toast({
                title: "오류",
                description: "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
                variant: "destructive"
            });
            return;
        }

        try {
            // Generate unique payment ID
            const paymentId = `order_${crypto.randomUUID()}`;

            // Map our internal method to PortOne channelKey (Using test values or placeholders)
            // Since we don't have explicit channel keys for Kakao/Toss in the prompt, 
            // we will let PortOne handle the channel selection UI or use a general test channel if needed.
            // However, requestPayment requires storeId.
            // For specific PG (Kakao/Toss), we usually need channelKey. 
            // If channelKey is missing, it might open a general payment selection or fail depending on PortOne config.
            // Given the prompt "Test Store ID", we use that.

            // PortOne V2 requestPayment
            const response = await window.PortOne.requestPayment({
                storeId: "store-49462607-f6ad-4ada-bba9-a177cdebac40", // User-provided Store ID
                channelKey: "channel-key-8f869ce3-33e6-4e95-963a-97cfaeab8b1a", // Kakao Pay Channel Key
                paymentId: paymentId,
                orderName: menu.mainMenuName,
                totalAmount: menu.priceWon,
                currency: "KRW",
                payMethod: "EASY_PAY",
            });

            if (response.code != null) {
                // If response object has 'code' (error code), it failed
                if (response.code) {
                    toast({
                        title: "결제 실패 (Response Error)",
                        description: `Code: ${response.code}\nMessage: ${response.message}`,
                        variant: "destructive"
                    });
                    return;
                }
            }

            // Success Case (Mock)
            // alert("결제가 완료되었습니다! (테스트)"); // Removed simple alert

            // 1. Create Ticket (Data Sync)
            // Using 'KakaoPay' as method ensures balance is NOT deducted, but ticket is generated.
            const success = purchaseTicket(menu, 'KakaoPay');

            if (success) {
                // 2. Notification
                toast({
                    title: "결제 성공",
                    description: "식권이 발급되었습니다.",
                });

                // 3. UI Transition
                onClose();
                setLocation('/ticket');
            } else {
                toast({
                    title: "오류",
                    description: "식권 발급 중 문제가 발생했습니다.",
                    variant: "destructive"
                });
            }

        } catch (error: any) {
            console.error("Payment Error:", error);
            // Verify if it is a user cancellation or actual error
            toast({
                title: "결제 오류 (Exception)",
                description: `오류가 발생했습니다.\nCode: ${error.code || 'UNKNOWN'}\nMessage: ${error.message || JSON.stringify(error)}`,
                variant: 'destructive',
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
                        <div className={`flex items-center justify-between space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'charge' ? 'border-[#0E4A84] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                            onClick={() => setPaymentMethod('charge')}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="charge" id="charge" />
                                <Label htmlFor="charge" className="flex items-center cursor-pointer font-medium">
                                    <Wallet className="w-5 h-5 mr-3 text-[#0E4A84]" />
                                    충전액 결제
                                </Label>
                            </div>
                            <span className="text-sm text-gray-500">
                                잔액: {balance.toLocaleString()}원
                            </span>
                        </div>

                        {/* 2. Kakao Pay */}
                        <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'kakao' ? 'border-[#FFE812] bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                            onClick={() => setPaymentMethod('kakao')}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="kakao" id="kakao" />
                                <Label htmlFor="kakao" className="flex items-center cursor-pointer font-medium">
                                    {/* Kakao Icon (Simple SVG) */}
                                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="#3A1D1E" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.895 1.996 5.483 5.15 6.848l-.946 3.551c-.06.223.18.423.407.319l4.242-2.82c.381.045.769.068 1.157.068 5.523 0 10-3.477 10-7.765S17.523 3 12 3z" />
                                    </svg>
                                    카카오페이
                                </Label>
                            </div>
                        </div>

                        {/* 3. Other Payment Methods (Disabled) */}
                        <div className="flex items-center space-x-2 border rounded-lg p-4 bg-gray-100 border-gray-200 cursor-not-allowed">
                            <div className="flex items-center space-x-3 opacity-50">
                                <RadioGroupItem value="disabled" id="disabled" disabled className="data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400" />
                                <Label htmlFor="disabled" className="flex items-center font-medium text-gray-400 cursor-not-allowed">
                                    <CreditCard className="w-5 h-5 mr-3 text-gray-400" />
                                    다른 결제 수단
                                </Label>
                            </div>
                        </div>

                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="flex-1 h-12">취소</Button>
                    <Button
                        onClick={handlePurchase}
                        className={`flex-1 h-12 text-base font-semibold ${paymentMethod === 'kakao' ? 'bg-[#FFE812] text-[#3A1D1E] hover:bg-[#FDD835]' :
                            'bg-[#0E4A84] hover:bg-[#0b3d6e] text-white'
                            }`}
                    >
                        {formatPrice(menu.priceWon)} 결제하기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Add strict type for window.PortOne to avoid TS errors
declare global {
    interface Window {
        PortOne: any;
    }
}
