import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Save, Settings, Archive, ChevronDown, Calendar, 
    Camera, Maximize2, SkipBack, ChevronLeft, Play, Pause, 
    ChevronRight, SkipForward, BookmarkPlus, BookOpen,
    CandlestickChart, BarChart2, LineChart, AreaChart,
    LayoutTemplate, Sparkles, Check
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Chart, { ChartRef } from './components/Chart';
import VaultModal from './components/VaultModal';
import JournalModal from './components/JournalModal';
import SaveModal from './components/SaveModal';
import Toast, { ToastType } from './components/Toast';
import { OHLCData, VolumeData, VaultItem, ToolType, ChartType, SessionStats } from './types';
import { generateOHLCData, generateVolumeData } from './utils/dataGenerator';

const App: React.FC = () => {
    // State
    const [currentTool, setCurrentTool] = useState<ToolType>('crosshair');
    const [chartType, setChartType] = useState<ChartType>('Candle');
    const [isVaultOpen, setIsVaultOpen] = useState(false);
    const [isJournalOpen, setIsJournalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [currentIndex, setCurrentIndex] = useState(50);
    const [data] = useState<OHLCData[]>(() => generateOHLCData(1000));
    const [volumeData] = useState<VolumeData[]>(() => generateVolumeData(data));
    const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);
    
    // Indicators & Templates State
    const [openMenu, setOpenMenu] = useState<'indicators' | 'templates' | null>(null);
    const [activeIndicators, setActiveIndicators] = useState<string[]>(['volume', 'ema20']);
    const [currentTemplate, setCurrentTemplate] = useState<string>('standard');

    // Trade Simulation State
    const [lotSize, setLotSize] = useState(0.10);
    const [stopLoss, setStopLoss] = useState("1.08339");
    const [takeProfit, setTakeProfit] = useState("1.09089");
    
    // Session Stats
    const [sessionStats, setSessionStats] = useState<SessionStats>({
        balance: 10420,
        startBalance: 10000,
        winRate: 62.5,
        tradesCount: 24,
        wins: 15,
        losses: 9,
        pnl: 420
    });

    const [vaultItems, setVaultItems] = useState<VaultItem[]>([
        {
            id: 1,
            title: "EUR/USD London Session Breakout",
            category: "drawing",
            asset: "EURUSD",
            timeframe: "M15",
            tags: ["breakout", "support"],
            notes: "Clean break of Asian session high.",
            createdAt: "2024-02-15T10:30:00",
            thumbnail: null,
            drawingsCount: 5,
            color: "blue"
        },
        {
            id: 2,
            title: "NFP Replay Session",
            category: "replay",
            asset: "EURUSD",
            timeframe: "M5",
            tags: ["news"],
            notes: "Practice session for NFP.",
            createdAt: "2024-02-12T14:00:00",
            thumbnail: null,
            drawingsCount: 3,
            color: "purple"
        }
    ]);

    // Data Constants
    const INDICATORS = [
        { id: 'volume', label: 'Volume' },
        { id: 'ema20', label: 'EMA 20' },
        { id: 'ema50', label: 'EMA 50' },
        { id: 'rsi', label: 'RSI (14)' },
        { id: 'bollinger', label: 'Bollinger Bands' },
        { id: 'macd', label: 'MACD' },
        { id: 'vp', label: 'Volume Profile' },
    ];

    const TEMPLATES = [
        { id: 'standard', label: 'Standard' },
        { id: 'clean', label: 'Price Action (Clean)' },
        { id: 'smc', label: 'Smart Money (SMC)' },
        { id: 'scalp', label: 'Scalping (1m/5m)' },
        { id: 'swing', label: 'Swing Trading' },
    ];

    const chartRef = useRef<ChartRef>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    setIsPlaying(prev => !prev);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    setCurrentIndex(prev => Math.max(0, prev - 1));
                    setIsPlaying(false);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setCurrentIndex(prev => Math.min(data.length - 1, prev + 1));
                    setIsPlaying(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data.length]);

    // Playback Logic
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= data.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000 / playbackSpeed);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackSpeed, data.length]);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    };

    const handleSaveSession = (saveData: any) => {
        const newItem: VaultItem = {
            id: Date.now(),
            title: saveData.title,
            category: saveData.category,
            asset: 'EURUSD', // In real app, get from current state
            timeframe: 'M15',
            tags: saveData.tags,
            notes: saveData.notes,
            createdAt: new Date().toISOString(),
            thumbnail: null,
            drawingsCount: Math.floor(Math.random() * 10),
            color: 'emerald'
        };
        setVaultItems([newItem, ...vaultItems]);
        setIsSaveModalOpen(false);
        showToast("Session saved to vault successfully!");
    };

    const handleQuickSave = () => {
        const newItem: VaultItem = {
            id: Date.now(),
            title: `Quick Save - ${new Date().toLocaleString()}`,
            category: 'replay',
            asset: 'EURUSD',
            timeframe: 'M15',
            tags: ['quick'],
            notes: 'Auto-saved from replay',
            createdAt: new Date().toISOString(),
            thumbnail: null,
            drawingsCount: 0,
            color: 'blue'
        };
        setVaultItems([newItem, ...vaultItems]);
        showToast("Quick save added to vault!");
    };

    const handleDeleteVaultItem = (id: number) => {
        setVaultItems(prev => prev.filter(i => i.id !== id));
        showToast("Item deleted from vault", "info");
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    };

    const executeTrade = (type: 'LONG' | 'SHORT') => {
        const currentPrice = data[currentIndex].close;
        const entryPrice = currentPrice;
        
        // Simulate immediate outcome for demo purposes
        const isWin = Math.random() > 0.5;
        const pnl = isWin ? (lotSize * 100) : -(lotSize * 50); 
        
        setSessionStats(prev => ({
            ...prev,
            tradesCount: prev.tradesCount + 1,
            wins: prev.wins + (isWin ? 1 : 0),
            losses: prev.losses + (isWin ? 0 : 1),
            balance: prev.balance + pnl,
            pnl: prev.pnl + pnl,
            winRate: Math.round(((prev.wins + (isWin ? 1 : 0)) / (prev.tradesCount + 1)) * 100)
        }));

        showToast(`${type} Executed @ ${entryPrice.toFixed(5)} (${isWin ? 'Win' : 'Loss'})`, isWin ? 'success' : 'error');
    };

    const toggleIndicator = (id: string) => {
        setActiveIndicators(prev => {
            const isActive = prev.includes(id);
            const newIndicators = isActive ? prev.filter(i => i !== id) : [...prev, id];
            showToast(isActive ? `${INDICATORS.find(i=>i.id===id)?.label} Removed` : `${INDICATORS.find(i=>i.id===id)?.label} Added`, 'info');
            return newIndicators;
        });
    };

    const applyTemplate = (id: string) => {
        setCurrentTemplate(id);
        setOpenMenu(null);
        showToast(`Template applied: ${TEMPLATES.find(t=>t.id===id)?.label}`, 'success');
    };

    return (
        <div className="min-h-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-200 font-sans">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Backdrop for menus */}
            {openMenu && (
                <div className="fixed inset-0 z-[55]" onClick={() => setOpenMenu(null)} />
            )}
            
            {/* Header */}
            <header data-tauri-drag-region="true" className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800/50 h-11 select-none">
                <div className="flex items-center justify-between h-full px-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 pointer-events-none">
                            <span className="text-sm font-semibold tracking-tighter text-white">DAAVFX</span>
                            <span className="text-xs text-zinc-600">|</span>
                            <span className="text-xs text-zinc-500 tracking-tight">RYIUK</span>
                        </div>
                        <div className="hidden md:flex items-center gap-1 ml-4">
                            <button className="px-2.5 py-1 text-xs font-medium text-white bg-zinc-800 rounded hover:bg-zinc-700 transition-colors">Replay</button>
                            <button onClick={() => setIsVaultOpen(true)} className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded transition-colors flex items-center gap-1.5">
                                <Archive size={12} /> Vault
                            </button>
                            <button onClick={() => setIsJournalOpen(true)} className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded transition-colors flex items-center gap-1.5">
                                <BookOpen size={12} /> Journal
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded">
                            <span className="text-xs text-zinc-500">Session:</span>
                            <span className="text-xs font-medium text-white">EUR/USD Backtest #12</span>
                        </div>
                        <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">
                            <Save size={12} /> Save
                        </button>
                        
                        {/* Custom Window Controls (Mac Style) */}
                        <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-800">
                             <div className="w-3 h-3 rounded-full bg-yellow-500/20 hover:bg-yellow-500 transition-colors cursor-pointer"></div>
                             <div className="w-3 h-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500 transition-colors cursor-pointer"></div>
                             <div className="w-3 h-3 rounded-full bg-red-500/20 hover:bg-red-500 transition-colors cursor-pointer"></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="pt-11 h-screen flex">
                <Sidebar currentTool={currentTool} setTool={setCurrentTool} onDeleteAll={() => showToast("All drawings cleared", "info")} />

                <div className="flex-1 flex flex-col">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50 bg-zinc-950/50">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded transition-colors">
                                    <span className="text-sm font-semibold text-white">EUR/USD</span>
                                    <ChevronDown size={14} className="text-zinc-500" />
                                </button>
                            </div>
                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                                {['M1','M5','M15','H1','H4','D1'].map(tf => (
                                    <button key={tf} className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${tf === 'M15' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>{tf}</button>
                                ))}
                            </div>
                            
                            {/* Chart Type Selector */}
                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                                <button onClick={() => setChartType('Candle')} className={`px-2 py-1.5 transition-colors ${chartType === 'Candle' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="Candles"><CandlestickChart size={14} /></button>
                                <button onClick={() => setChartType('Bar')} className={`px-2 py-1.5 transition-colors ${chartType === 'Bar' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="Bars"><BarChart2 size={14} /></button>
                                <button onClick={() => setChartType('Line')} className={`px-2 py-1.5 transition-colors ${chartType === 'Line' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="Line"><LineChart size={14} /></button>
                                <button onClick={() => setChartType('Area')} className={`px-2 py-1.5 transition-colors ${chartType === 'Area' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="Area"><AreaChart size={14} /></button>
                            </div>

                            <div className="hidden lg:flex items-center gap-2">
                                <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded transition-colors">
                                    <Calendar size={13} />
                                    <span>Jan 15, 2024</span>
                                    <span className="text-zinc-600">→</span>
                                    <span>Mar 20, 2024</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 relative">
                            {/* Indicators Dropdown */}
                            <div className="relative">
                                <button 
                                    onClick={() => setOpenMenu(openMenu === 'indicators' ? null : 'indicators')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded transition-colors ${openMenu === 'indicators' ? 'text-white bg-zinc-800 border-zinc-700' : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <Sparkles size={13} /> Indicators
                                </button>
                                {openMenu === 'indicators' && (
                                    <div className="absolute top-full right-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-[60] py-1 animate-fadeIn">
                                        <div className="px-3 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase">Available Indicators</div>
                                        {INDICATORS.map(ind => (
                                            <button 
                                                key={ind.id} 
                                                onClick={() => toggleIndicator(ind.id)} 
                                                className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-zinc-800 text-left transition-colors"
                                            >
                                                <span className={activeIndicators.includes(ind.id) ? 'text-white' : 'text-zinc-400'}>{ind.label}</span>
                                                {activeIndicators.includes(ind.id) && <Check size={12} className="text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Templates Dropdown */}
                            <div className="relative">
                                <button 
                                    onClick={() => setOpenMenu(openMenu === 'templates' ? null : 'templates')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded transition-colors ${openMenu === 'templates' ? 'text-white bg-zinc-800 border-zinc-700' : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <LayoutTemplate size={13} /> Templates
                                </button>
                                {openMenu === 'templates' && (
                                    <div className="absolute top-full right-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-[60] py-1 animate-fadeIn">
                                        <div className="px-3 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase">Chart Templates</div>
                                        {TEMPLATES.map(temp => (
                                            <button 
                                                key={temp.id} 
                                                onClick={() => applyTemplate(temp.id)} 
                                                className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-zinc-800 text-left transition-colors"
                                            >
                                                <span className={currentTemplate === temp.id ? 'text-white' : 'text-zinc-400'}>{temp.label}</span>
                                                {currentTemplate === temp.id && <Check size={12} className="text-emerald-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Screenshot">
                                <Camera size={15} />
                            </button>
                            <button onClick={toggleFullscreen} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Fullscreen">
                                <Maximize2 size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Chart Area */}
                            <Chart 
                                ref={chartRef}
                                data={data} 
                                volumeData={volumeData}
                                currentIndex={currentIndex}
                                onIndexChange={setCurrentIndex}
                                currentTool={currentTool}
                                chartType={chartType}
                            />
                            
                            {/* Playback Controls */}
                            <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-950/80">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setCurrentIndex(0)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Start"><SkipBack size={16} /></button>
                                        <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Previous Candle (Left Arrow)"><ChevronLeft size={16} /></button>
                                        <button onClick={() => setIsPlaying(!isPlaying)} className="p-2.5 text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors" title="Play/Pause (Space)">
                                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                        </button>
                                        <button onClick={() => setCurrentIndex(Math.min(data.length - 1, currentIndex + 1))} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Next Candle (Right Arrow)"><ChevronRight size={16} /></button>
                                        <button onClick={() => setCurrentIndex(data.length - 1)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="End"><SkipForward size={16} /></button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500">Speed</span>
                                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                                            {[0.5, 1, 2, 5, 10].map(speed => (
                                                <button 
                                                    key={speed}
                                                    onClick={() => setPlaybackSpeed(speed)}
                                                    className={`px-2 py-1 text-xs transition-colors ${playbackSpeed === speed ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                                >
                                                    {speed}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex items-center gap-3">
                                        <span className="text-xs mono text-zinc-500">{currentIndex}</span>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max={data.length - 1} 
                                            value={currentIndex} 
                                            onChange={(e) => { setIsPlaying(false); setCurrentIndex(Number(e.target.value)); }}
                                            className="flex-1 cursor-pointer" 
                                        />
                                        <span className="text-xs mono text-zinc-500">{data.length - 1}</span>
                                    </div>

                                    <button onClick={handleQuickSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors">
                                        <BookmarkPlus size={14} /> Quick Save
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel */}
                        <aside className="w-72 border-l border-zinc-800/50 flex flex-col bg-zinc-950/30">
                            {/* Trade Panel */}
                            <div className="p-3 border-b border-zinc-800/50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-medium text-zinc-300">Place Trade</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => executeTrade('LONG')} className="px-2 py-1 text-xs text-emerald-400 bg-emerald-500/10 rounded hover:bg-emerald-500/20 transition-colors">Buy</button>
                                        <button onClick={() => executeTrade('SHORT')} className="px-2 py-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">Sell</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1.5 block">Lot Size</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={lotSize}
                                                onChange={(e) => setLotSize(Number(e.target.value))}
                                                step="0.01" 
                                                min="0.01"
                                                className="flex-1 h-8 px-3 text-xs mono bg-zinc-900 border border-zinc-800 rounded text-white focus:outline-none focus:border-zinc-600" 
                                            />
                                            <div className="flex gap-1">
                                                <button onClick={() => setLotSize(0.1)} className="px-2 py-1.5 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">0.1</button>
                                                <button onClick={() => setLotSize(0.5)} className="px-2 py-1.5 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">0.5</button>
                                                <button onClick={() => setLotSize(1.0)} className="px-2 py-1.5 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">1.0</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-zinc-500 mb-1.5 block">Stop Loss</label>
                                            <input 
                                                type="text" 
                                                value={stopLoss}
                                                onChange={(e) => setStopLoss(e.target.value)}
                                                className="w-full h-8 px-3 text-xs mono bg-zinc-900 border border-zinc-800 rounded text-white focus:outline-none focus:border-zinc-600" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-zinc-500 mb-1.5 block">Take Profit</label>
                                            <input 
                                                type="text" 
                                                value={takeProfit}
                                                onChange={(e) => setTakeProfit(e.target.value)}
                                                className="w-full h-8 px-3 text-xs mono bg-zinc-900 border border-zinc-800 rounded text-white focus:outline-none focus:border-zinc-600" 
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button onClick={() => executeTrade('LONG')} className="w-full py-2.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-lg shadow-emerald-900/20">
                                            Buy Market
                                        </button>
                                        <button onClick={() => executeTrade('SHORT')} className="w-full py-2.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors shadow-lg shadow-red-900/20">
                                            Sell Market
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Session Stats */}
                            <div className="p-3 border-b border-zinc-800/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-zinc-300">Session Stats</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Balance</span>
                                        <span className="mono text-white">${sessionStats.balance.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Win Rate</span>
                                        <span className="mono text-emerald-400">{sessionStats.winRate}%</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Trades</span>
                                        <span className="mono text-white">{sessionStats.tradesCount}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">P/L</span>
                                        <span className={`mono ${sessionStats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {sessionStats.pnl >= 0 ? '+' : ''}${sessionStats.pnl}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
                                    <span className="text-xs font-medium text-zinc-300">Recent Vault Items</span>
                                    <button onClick={() => setIsVaultOpen(true)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View All</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {vaultItems.slice(0, 5).map(item => (
                                        <div key={item.id} onClick={() => setIsVaultOpen(true)} className="p-2 bg-zinc-800/30 border border-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-1.5 h-1.5 bg-${item.color}-500 rounded-full`}></span>
                                                <span className="text-xs font-medium text-white truncate">{item.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">{item.asset}</span>
                                                <span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            <VaultModal 
                isOpen={isVaultOpen} 
                onClose={() => setIsVaultOpen(false)}
                items={vaultItems}
                onLoad={() => { setIsVaultOpen(false); showToast("Session loaded!"); }}
                onDelete={handleDeleteVaultItem}
                onNew={() => { setIsVaultOpen(false); setIsSaveModalOpen(true); }}
            />
            
            <JournalModal 
                isOpen={isJournalOpen}
                onClose={() => setIsJournalOpen(false)}
            />

            <SaveModal 
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSaveSession}
            />
        </div>
    );
};

export default App;
