import { useState } from 'react';
import { useTicketContext } from '@/lib/ticketContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QrCode, X } from 'lucide-react';
import QRCode from "react-qr-code";
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
    const { tickets, activateTicket, markUsed, remainingSeconds } = useTicketContext();

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
                    <Card className="p-4 border-l-4 border-l-green-500 bg-green-50/50 shadow-sm">
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
                                        <Button
                                            className="w-full bg-[#0E4A84] hover:bg-[#0b3d6e]"
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

                // Timer Logic for Red Color
                const remaining = remainingSeconds(t.id);
                const isUrgent = remaining < 30;

                return (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">

                        {/* Wrapper for Layout */}
                        <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-gray-900/5">

                            {/* Close Button - Using plain button for definitive positioning */}
                            <button
                                className="absolute top-5 right-5 z-[60] text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors bg-transparent border-0 cursor-pointer"
                                onClick={() => handleQRClose(false)}
                                aria-label="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Header (Title) */}
                            <div className="relative pt-6 pb-4 px-6 border-b border-gray-100 text-center">
                                <h2 className="text-xl font-bold text-[#0E4A84]">식권 사용하기</h2>
                            </div>

                            {/* Content */}
                            <div className="pt-8 pb-6 text-center px-6">

                                <div className="mb-8">
                                    <div className="text-sm text-gray-500 font-medium mb-1">{rName} · {cName}</div>
                                    <div className="text-2xl font-bold text-[#0E4A84] leading-tight mt-1">
                                        {t.menuName}
                                    </div>
                                </div>

                                {/* QR Code Area */}
                                <div className="flex justify-center mb-8">
                                    <div className="p-4 bg-white rounded-2xl shadow-[0_8px_30px_rgba(14,74,132,0.15)] border border-gray-100 relative">
                                        {/* Decorative Corner Frame Lines in Hanyang Blue */}
                                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#0E4A84] rounded-tl-xl -mt-1 -ml-1"></div>
                                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#0E4A84] rounded-tr-xl -mt-1 -mr-1"></div>
                                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#0E4A84] rounded-bl-xl -mb-1 -ml-1"></div>
                                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#0E4A84] rounded-br-xl -mb-1 -mr-1"></div>

                                        <QRCode
                                            value={t.id}
                                            size={240}
                                            viewBox={`0 0 256 256`}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        />
                                    </div>
                                </div>

                                {/* Timer */}
                                <div className={`text-4xl font-mono font-bold tracking-tight tabular-nums mb-2 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-[#0E4A84]'}`}>
                                    {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                                </div>
                                <p className="text-sm text-gray-400 font-medium">남은 시간</p>
                            </div>

                            {/* Footer / Guide */}
                            <div className="bg-gray-50/80 p-5 text-center border-t border-gray-100 backdrop-blur-sm">
                                <p className="text-sm text-gray-500 mb-4 font-medium">
                                    리더기에 QR 코드를 스캔해주세요.
                                </p>
                                <Button
                                    className="w-full bg-[#0E4A84] hover:bg-[#0A3865] text-white font-bold py-6 text-lg rounded-xl shadow-lg transition-all duration-200"
                                    onClick={() => handleQRClose(true)} // User clicks "Done" -> Mark Used
                                >
                                    사용 완료
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </section>
    );
}
