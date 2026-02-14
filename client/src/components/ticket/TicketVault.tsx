import { useState } from 'react';
import { useTicketContext } from '@/lib/ticketContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QrCode, X } from 'lucide-react';
import { formatPrice, RESTAURANTS } from '@shared/types';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';

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

export function TicketVault() {
    const { tickets, cancelTicket, activateTicket, markUsed, remainingSeconds } = useTicketContext();

    // -- Local State --
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showQRFullscreen, setShowQRFullscreen] = useState(false);
    const [qrCodeString, setQrCodeString] = useState('');

    // -- Derived Data --
    const storedTickets = tickets.filter(t => t.status === 'stored');
    const activeTicket = tickets.find(t => t.status === 'active');

    // -- Actions --
    const initiateActivation = (ticketId: string) => {
        setSelectedTicketId(ticketId);
        setShowConfirmModal(true);
    };

    const confirmActivation = () => {
        if (selectedTicketId) {
            activateTicket(selectedTicketId);
            // Generate a manual code for display
            setQrCodeString(Math.random().toString(36).substring(2, 8).toUpperCase().replace(/[OI]/g, 'X'));
            setShowConfirmModal(false);
            setShowQRFullscreen(true);
        }
    };

    const handleQRClose = (completed: boolean) => {
        if (completed && activeTicket) {
            markUsed(activeTicket.id);
        }
        setShowQRFullscreen(false);
        setSelectedTicketId(null);
    };

    // Helper to find names
    const getNames = (rId: string, cId: string) => {
        const r = RESTAURANTS.find(res => res.id === rId);
        const rName = r?.name || rId;
        const cName = CORNER_DISPLAY_NAMES[cId] || cId;
        return { rName, cName };
    };

    return (
        <section>
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <TicketIcon className="w-5 h-5 text-gray-700" />
                    내 식권
                    <span className="text-[#0E4A84] text-sm ml-1">{storedTickets.length + (activeTicket ? 1 : 0)}</span>
                </h2>
            </div>

            {activeTicket && (
                <div className="mb-4">
                    <Card className="p-4 border-l-4 border-l-green-500 bg-green-50/50 shadow-sm animate-pulse">
                        <div className="flex justify-between items-start mb-2">
                            <Badge className="bg-green-500 hover:bg-green-600">사용 중 (QR 활성화)</Badge>
                            <span className="text-xs text-green-700 font-bold">{Math.floor(remainingSeconds(activeTicket.id) / 60)}분 {remainingSeconds(activeTicket.id) % 60}초 남음</span>
                        </div>
                        <div className="font-bold text-lg">{activeTicket.menuName}</div>
                        <div className="text-sm text-gray-600 mb-3">
                            {getNames(activeTicket.restaurantId, activeTicket.cornerId).rName} · {getNames(activeTicket.restaurantId, activeTicket.cornerId).cName}
                        </div>
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => {
                            setSelectedTicketId(activeTicket.id);
                            setShowQRFullscreen(true);
                        }}>
                            QR 코드 다시 보기
                        </Button>
                    </Card>
                </div>
            )}

            {storedTickets.length === 0 && !activeTicket ? (
                <div className="text-center py-10 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <TicketIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">보유한 식권이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {storedTickets.map(ticket => {
                        const { rName, cName } = getNames(ticket.restaurantId, ticket.cornerId);
                        const canCancel = (Date.now() - ticket.createdAt) < (5 * 60 * 1000); // 5 min

                        return (
                            <Card key={ticket.id} className="p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-lg text-gray-900">{ticket.menuName}</h3>
                                        <Badge variant="outline" className="text-gray-500 border-gray-200">미사용</Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">{rName}</p>
                                    <p className="text-sm text-gray-400 mb-4">{cName}</p>

                                    <div className="flex justify-between items-center text-sm mb-4">
                                        <span className="font-medium text-gray-900">{formatPrice(ticket.priceWon)}</span>
                                        <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 구매</span>
                                    </div>

                                    <div className="flex gap-2">
                                        {canCancel && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => cancelTicket(ticket.id)}
                                            >
                                                취소
                                            </Button>
                                        )}
                                        <Button
                                            className="flex-[2] bg-[#0E4A84] hover:bg-[#0b3d6e]"
                                            size="sm"
                                            onClick={() => initiateActivation(ticket.id)}
                                        >
                                            <QrCode className="w-4 h-4 mr-1.5" />
                                            QR 사용하기
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* QR Confirmation Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent>
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-center text-xl">QR 코드 생성</DialogTitle>
                        <DialogDescription className="text-center space-y-2">
                            {selectedTicketId && (() => {
                                const t = tickets.find(tik => tik.id === selectedTicketId);
                                if (!t) return null;
                                const { rName, cName } = getNames(t.restaurantId, t.cornerId);
                                return (
                                    <div className="bg-gray-50 p-3 rounded-lg text-gray-900 font-medium">
                                        {rName}-{cName}-{t.menuName}
                                    </div>
                                );
                            })()}
                            <div className="text-red-500 font-medium">QR 코드를 생성하면 사용 처리 됩니다.</div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(false)}>취소</Button>
                        <Button className="flex-1 bg-[#0E4A84]" onClick={confirmActivation}>확인</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fullscreen QR View */}
            {showQRFullscreen && (activeTicket || selectedTicketId) && (() => {
                const t = activeTicket || tickets.find(tik => tik.id === selectedTicketId);
                if (!t) return null;
                const { rName, cName } = getNames(t.restaurantId, t.cornerId);

                return (
                    <div className="fixed inset-0 z-[100] bg-[#0E4A84] flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-200">
                        <Button
                            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full w-10 h-10 p-0"
                            variant="ghost"
                            onClick={() => handleQRClose(false)}
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2">{t.menuName}</h2>
                            <p className="text-lg opacity-80">{rName} · {cName}</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm aspect-square flex items-center justify-center mb-8 relative">
                            {/* QR Placeholder */}
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white rounded-xl">
                                [ QR CODE PLACEHOLDER ]
                            </div>
                            <div className="absolute -bottom-12 left-0 right-0 text-center">
                                <p className="text-3xl font-mono font-bold tracking-widest">{qrCodeString || '------'}</p>
                            </div>
                        </div>

                        <p className="text-center text-white/60 text-sm mb-8 max-w-xs">
                            리더기에 QR 코드를 스캔해주세요.<br />
                            문제가 발생하면 직원에게 위 번호를 보여주세요.
                        </p>

                        <div className="flex gap-4 w-full max-w-xs">
                            <Button variant="outline" className="flex-1 bg-transparent text-white border-white/40 hover:bg-white/10">
                                화면 밝기 최대
                            </Button>
                            <Button
                                className="flex-1 bg-white text-[#0E4A84] hover:bg-gray-100"
                                onClick={() => handleQRClose(true)} // User clicks "Done" -> Mark Used
                            >
                                사용 완료
                            </Button>
                        </div>
                    </div>
                );
            })()}

        </section>
    );
}
