import { useState } from 'react';
import { useTicketContext } from '@/lib/ticketContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { formatPrice, RESTAURANTS } from '@shared/types';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';
// New Import
import { TicketVault } from '@/components/ticket/TicketVault';

export default function TabTicket() {
    const { history, balance, chargeBalance } = useTicketContext();

    // -- Local State --
    const [showTopup, setShowTopup] = useState(false);

    // -- Actions --
    const handleTopup = (amount: number) => {
        chargeBalance(amount);
        setShowTopup(false);
    };

    // Helper to find names
    const getNames = (rId: string, cId: string) => {
        const r = RESTAURANTS.find(res => res.id === rId);
        const rName = r?.name || rId;
        const cName = CORNER_DISPLAY_NAMES[cId] || cId;
        return { rName, cName };
    };

    // -- Render --
    return (
        <div className="min-h-screen bg-gray-50 pb-20">

            {/* A) Top-up Balance Card */}
            <div className="bg-white p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold mb-6">식권</h1>
                <Card className="p-5 bg-[#0E4A84] text-white border-none shadow-md">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-white/80 text-sm">보유 금액</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white hover:bg-white/10 h-auto p-0 text-xs"
                        >
                            충전 내역
                        </Button>
                    </div>
                    <div className="text-3xl font-bold mb-6">
                        {balance.toLocaleString()}원
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="flex-1 bg-white text-[#0E4A84] hover:bg-white/90 font-semibold"
                            onClick={() => setShowTopup(true)}
                        >
                            <Plus className="w-4 h-4 mr-1.5" /> 충전하기
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Top-up Dialog (Simple Simulation) */}
            <Dialog open={showTopup} onOpenChange={setShowTopup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>금액 충전</DialogTitle>
                        <DialogDescription>충전할 금액을 선택해주세요. (시뮬레이션)</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-4">
                        {[5000, 10000, 20000, 50000].map(amt => (
                            <Button key={amt} variant="outline" onClick={() => handleTopup(amt)}>
                                +{amt.toLocaleString()}원
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>


            <div className="px-4 mt-6 space-y-6">

                {/* B) My Tickets (Vault) - Refactored to Component */}
                <TicketVault />

                {/* C) Recent Redeemed (History) */}
                {history.length > 0 && (
                    <section>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-bold text-gray-800">최근 사용 내역</h2>
                            <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-auto p-0">전체보기</Button>
                        </div>
                        <Card className="divide-y divide-gray-100 bg-white border-0 shadow-sm">
                            {history.slice(0, 3).map(ticket => {
                                const { rName, cName } = getNames(ticket.restaurantId, ticket.cornerId);
                                return (
                                    <div key={ticket.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-gray-900">{ticket.menuName}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{rName} · {cName}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(ticket.activatedAt || 0).toLocaleDateString()} {new Date(ticket.activatedAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 사용
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">{formatPrice(ticket.priceWon)}</div>
                                            <Badge variant="secondary" className="mt-1 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0 h-5">사용완료</Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </Card>
                    </section>
                )}

            </div>

        </div>
    );
}


function TicketIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" />
            <path d="M13 17v2" />
            <path d="M13 11v2" />
        </svg>
    )
}
