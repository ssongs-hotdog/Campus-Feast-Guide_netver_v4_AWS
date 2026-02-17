import { useState } from 'react';
import { useTicketContext } from '@/lib/ticketContext';
import { isMobile } from '@/lib/utils';
import { formatPrice } from '@shared/types';
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
import { CreditCard, Wallet } from 'lucide-react';
import { PaymentSuccessModal } from './PaymentSuccessModal';
import { useToast } from '@/hooks/use-toast';

interface ChargePaymentSheetProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
}

export function ChargePaymentSheet({ isOpen, onClose, amount }: ChargePaymentSheetProps) {
    const { chargeBalance } = useTicketContext();
    const { toast } = useToast();
    const [paymentMethod, setPaymentMethod] = useState('kakao'); // 'kakao', 'other'
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handlePurchase = async () => {
        // Case B: Other Payment Methods (Simulation)
        if (paymentMethod === 'other') {
            chargeBalance(amount);
            setShowSuccessModal(true);
            return;
        }

        // Case A: PortOne Kakao Pay
        if (!window.PortOne) {
            toast({
                title: "오류",
                description: "결제 모듈을 불러오지 못했습니다.",
                variant: "destructive"
            });
            return;
        }

        try {
            const paymentId = `charge_${Date.now()}`;
            const isMobileDevice = isMobile();
            const response = await window.PortOne.requestPayment({
                storeId: "store-49462607-f6ad-4ada-bba9-a177cdebac40", // User-provided Store ID
                channelKey: "channel-key-8f869ce3-33e6-4e95-963a-97cfaeab8b1a", // Kakao Pay Channel Key
                paymentId: paymentId,
                orderName: `HY-eat 포인트 ${amount.toLocaleString()}원 충전`,
                totalAmount: amount,
                currency: "KRW",
                payMethod: "EASY_PAY",
                redirectUrl: isMobileDevice ? window.location.href : undefined,
                windowType: {
                    pc: "IFRAME",
                    mobile: "REDIRECTION",
                },
            });

            if (response.code != null) {
                toast({
                    title: "결제 실패",
                    description: `Code: ${response.code}\nMessage: ${response.message}`,
                    variant: "destructive"
                });
                return;
            }

            // Success
            chargeBalance(amount);
            // toast({
            //     title: "충전 완료",
            //     description: `${amount.toLocaleString()}원이 충전되었습니다.`
            // });
            // onClose();
            setShowSuccessModal(true);

        } catch (error: any) {
            console.error("Payment Error:", error);
            toast({
                title: "결제 오류",
                description: `오류가 발생했습니다.\n${error.message}`,
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>포인트 충전</DialogTitle>
                    <DialogDescription>
                        결제 수단을 선택해주세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="font-bold text-lg mb-1">포인트 충전</h3>
                        <p className="text-sm text-gray-500 mb-2">{formatPrice(amount)}</p>
                    </div>

                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-3">

                        {/* 1. Kakao Pay */}
                        <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'kakao' ? 'border-[#FFE812] bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                            onClick={() => setPaymentMethod('kakao')}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="kakao" id="kakao" />
                                <Label htmlFor="kakao" className="flex items-center cursor-pointer font-medium">
                                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="#3A1D1E" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.895 1.996 5.483 5.15 6.848l-.946 3.551c-.06.223.18.423.407.319l4.242-2.82c.381.045.769.068 1.157.068 5.523 0 10-3.477 10-7.765S17.523 3 12 3z" />
                                    </svg>
                                    카카오페이
                                </Label>
                            </div>
                        </div>

                        {/* 2. Other Payment Methods (Simulation) */}
                        <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'other' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                            onClick={() => setPaymentMethod('other')}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="other" id="other" />
                                <Label htmlFor="other" className="flex items-center cursor-pointer font-medium">
                                    <CreditCard className="w-5 h-5 mr-3 text-gray-600" />
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
                            'bg-gray-800 hover:bg-gray-700 text-white'
                            }`}
                    >
                        {formatPrice(amount)} 결제하기
                    </Button>
                </DialogFooter>
            </DialogContent>

            <PaymentSuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    onClose();
                }}
                amount={amount}
            />
        </Dialog>
    );
}
