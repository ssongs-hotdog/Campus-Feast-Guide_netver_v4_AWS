import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { formatPrice } from '@shared/types';

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
}

export function PaymentSuccessModal({ isOpen, onClose, amount }: PaymentSuccessModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-xl p-6 border-0 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
                <DialogHeader className="flex flex-col items-center justify-center pt-4 pb-2">
                    <div className="rounded-full bg-green-50 p-3 mb-4">
                        <CheckCircle className="w-12 h-12 text-green-500" strokeWidth={2.5} />
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900 text-center">
                        충전 완료
                    </DialogTitle>
                    <p className="text-gray-600 mt-2 text-center text-base">
                        {formatPrice(amount)}이 충전되었습니다.
                    </p>
                </DialogHeader>

                <DialogFooter className="mt-6 sm:justify-center">
                    <Button
                        onClick={onClose}
                        className="w-full h-12 rounded-xl bg-[#0E4A84] hover:bg-[#0b3d6e] text-white text-base font-semibold transition-colors"
                    >
                        확인
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
