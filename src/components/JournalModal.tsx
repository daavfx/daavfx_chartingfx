import React, { useState } from 'react';
import { 
    X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
    TrendingUp, TrendingDown, BookOpen, Smile, Frown, Meh, 
    AlertCircle, DollarSign, Percent, Hash, MoreHorizontal,
    Plus, Filter
} from 'lucide-react';
import { JournalDay, TradeEntry } from '../types';

interface JournalModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Mock Data Generator
const getMockData = (dateStr: string): JournalDay | null => {
    // Only return data for a few specific dates in Feb 2024
    if (dateStr === '2024-02-15') {
        return {
            date: '2024-02-15',
            mood: 'disciplined',
            note: "Excellent execution today. Waited for the London open liquidity sweep before entering. Managed risk well on the second trade.",
            trades: [
                { id: '1', pair: 'EURUSD', type: 'LONG', time: '09:30', entry: 1.08200, exit: 1.08550, lots: 2.0, pnl: 700, r: 3.5, status: 'WIN', setup: 'London Breakout' },
                { id: '2', pair: 'GBPUSD', type: 'SHORT', time: '11:15', entry: 1.26500, exit: 1.26600, lots: 1.5, pnl: -150, r: -1.0, status: 'LOSS', setup: 'Supply Rejection' },
                { id: '3', pair: 'XAUUSD', type: 'LONG', time: '14:00', entry: 2005.50, exit: 2008.00, lots: 0.5, pnl: 125, r: 1.2, status: 'WIN', setup: 'Support Bounce' }
            ]
        };
    }
    if (dateStr === '2024-02-14') {
        return {
            date: '2024-02-14',
            mood: 'tilted',
            note: "CPI data caused slippage. Revenge traded the aftermath. Need to stay away during high impact news.",
            trades: [
                { id: '4', pair: 'EURUSD', type: 'SHORT', time: '08:30', entry: 1.07800, exit: 1.07950, lots: 3.0, pnl: -450, r: -1.0, status: 'LOSS', setup: 'News Fade' },
                { id: '5', pair: 'EURUSD', type: 'LONG', time: '08:45', entry: 1.07950, exit: 1.07850, lots: 5.0, pnl: -500, r: -2.0, status: 'LOSS', setup: 'Revenge' }
            ]
        };
    }
    return null;
};

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose }) => {
    const [selectedDate, setSelectedDate] = useState<string>('2024-02-15');
    const [viewMonth, setViewMonth] = useState(new Date('2024-02-01'));

    if (!isOpen) return null;

    const journalData = getMockData(selectedDate);
    
    // Stats calc
    const totalPnL = journalData?.trades.reduce((acc, t) => acc + t.pnl, 0) || 0;
    const winRate = journalData ? Math.round((journalData.trades.filter(t => t.status === 'WIN').length / journalData.trades.length) * 100) : 0;
    const totalR = journalData?.trades.reduce((acc, t) => acc + t.r, 0) || 0;

    // Calendar Grid Gen
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const startDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay(); // 0 is Sun
    const calendarDays = [];
    
    // Pad empty days
    for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
        calendarDays.push(null);
    }
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    const MoodIcon = ({ mood }: { mood: string }) => {
        switch(mood) {
            case 'disciplined': return <Smile className="text-emerald-400" size={16} />;
            case 'tilted': return <AlertCircle className="text-red-400" size={16} />;
            case 'neutral': return <Meh className="text-zinc-400" size={16} />;
            default: return <Smile className="text-zinc-400" size={16} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80 animate-fadeIn backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-7xl h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl flex overflow-hidden animate-slideUp shadow-2xl">
                
                {/* Left Panel: Calendar & Nav */}
                <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-medium">
                            <BookOpen size={18} className="text-blue-500" />
                            Trading Journal
                        </div>
                        <div className="flex gap-1">
                            <button className="p-1 hover:bg-zinc-800 rounded"><ChevronLeft size={16} className="text-zinc-400" /></button>
                            <button className="p-1 hover:bg-zinc-800 rounded"><ChevronRight size={16} className="text-zinc-400" /></button>
                        </div>
                    </div>

                    <div className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">February 2024</h3>
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['M','T','W','T','F','S','S'].map((d, i) => (
                                <div key={i} className="text-xs text-zinc-500 text-center font-medium">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((day, i) => {
                                if (!day) return <div key={`empty-${i}`} />;
                                const dateStr = `2024-02-${day.toString().padStart(2, '0')}`;
                                const data = getMockData(dateStr);
                                const isSelected = dateStr === selectedDate;
                                
                                let bgClass = 'bg-zinc-900 border-zinc-800 hover:border-zinc-600';
                                if (isSelected) bgClass = 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20';
                                else if (data) {
                                    const pnl = data.trades.reduce((acc, t) => acc + t.pnl, 0);
                                    if (pnl > 0) bgClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                                    else if (pnl < 0) bgClass = 'bg-red-500/10 border-red-500/30 text-red-400';
                                }

                                return (
                                    <button 
                                        key={i}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all ${bgClass}`}
                                    >
                                        <span className="text-xs font-medium">{day}</span>
                                        {data && (
                                            <div className="flex gap-0.5 mt-1">
                                                <div className={`w-1 h-1 rounded-full ${data.trades.reduce((acc,t)=>acc+t.pnl,0) > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-auto p-4 border-t border-zinc-800">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                <span className="text-xs text-zinc-500 block mb-1">Monthly P&L</span>
                                <span className="text-sm font-mono text-emerald-400">+$2,450.00</span>
                            </div>
                            <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                <span className="text-xs text-zinc-500 block mb-1">Win Rate</span>
                                <span className="text-sm font-mono text-blue-400">68%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-zinc-950">
                    {/* Date Header */}
                    <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <CalendarIcon size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <span className={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}>
                                        {totalPnL >= 0 ? "Profitable Day" : "Loss Day"}
                                    </span>
                                    <span>•</span>
                                    <span>{journalData?.trades.length || 0} Trades Taken</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Daily Stats Row */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                    <DollarSign size={14} />
                                    <span className="text-xs font-medium uppercase">Net P&L</span>
                                </div>
                                <span className={`text-2xl font-mono font-medium ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                                </span>
                            </div>
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                    <TrendingUp size={14} />
                                    <span className="text-xs font-medium uppercase">R-Multiple</span>
                                </div>
                                <span className="text-2xl font-mono font-medium text-white">
                                    {totalR > 0 ? '+' : ''}{totalR.toFixed(1)}R
                                </span>
                            </div>
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                    <Percent size={14} />
                                    <span className="text-xs font-medium uppercase">Win Rate</span>
                                </div>
                                <span className="text-2xl font-mono font-medium text-blue-400">
                                    {winRate}%
                                </span>
                            </div>
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                    <Smile size={14} />
                                    <span className="text-xs font-medium uppercase">Psychology</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg text-white capitalize">{journalData?.mood || 'No Data'}</span>
                                    {journalData && <MoodIcon mood={journalData.mood} />}
                                </div>
                            </div>
                        </div>

                        {/* Daily Note */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-zinc-300">Daily Reflection</h3>
                                <button className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                            </div>
                            <div className="w-full p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl text-sm text-zinc-300 leading-relaxed">
                                {journalData?.note || "No notes recorded for this day."}
                            </div>
                        </div>

                        {/* Trades Table */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-zinc-300">Executed Trades</h3>
                                <div className="flex gap-2">
                                    <button className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded"><Filter size={14} /></button>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors">
                                        <Plus size={14} /> Add Trade
                                    </button>
                                </div>
                            </div>
                            
                            {journalData && journalData.trades.length > 0 ? (
                                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Time</th>
                                                <th className="px-4 py-3">Pair</th>
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Setup</th>
                                                <th className="px-4 py-3 text-right">Lots</th>
                                                <th className="px-4 py-3 text-right">Entry</th>
                                                <th className="px-4 py-3 text-right">Exit</th>
                                                <th className="px-4 py-3 text-right">R</th>
                                                <th className="px-4 py-3 text-right">P&L</th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                                            {journalData.trades.map((trade) => (
                                                <tr key={trade.id} className="hover:bg-zinc-800/30 transition-colors group">
                                                    <td className="px-4 py-3 font-mono text-zinc-400">{trade.time}</td>
                                                    <td className="px-4 py-3 font-semibold text-white">{trade.pair}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${trade.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                            {trade.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-zinc-300">{trade.setup}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-zinc-400">{trade.lots.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-zinc-400">{trade.entry}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-zinc-400">{trade.exit}</td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        <span className={trade.r > 0 ? "text-emerald-400" : "text-red-400"}>{trade.r}R</span>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-mono font-medium ${trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center border border-zinc-800 border-dashed rounded-xl text-zinc-500">
                                    <BookOpen size={24} className="mb-2 opacity-50" />
                                    <span className="text-sm">No trades recorded for this day.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JournalModal;