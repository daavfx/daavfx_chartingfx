import React, { useState, useEffect, useCallback } from 'react';
import {
    loadReplaySession,
    startReplay,
    pauseReplay,
    stopReplay,
    stepForward,
    stepBackward,
    setReplaySpeed,
    seekToIndex,
    getReplayState,
    advanceReplay,
} from '../services/replayService';

interface ReplayControlsProps {
    symbol: string;
    timeframe: string;
    isActive: boolean;
    onClose: () => void;
}

const ReplayControls: React.FC<ReplayControlsProps> = ({
    symbol,
    timeframe,
    isActive,
    onClose,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [totalCandles, setTotalCandles] = useState(0);
    const [speed, setSpeed] = useState(1.0);
    const [progress, setProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load replay session
    useEffect(() => {
        if (isActive && symbol && timeframe) {
            loadReplaySession(symbol, timeframe).then(info => {
                setTotalCandles(info.totalCandles);
                setCurrentIndex(0);
                setIsLoaded(true);
                setProgress(0);
            }).catch(err => {
                console.error('Failed to load replay:', err);
            });
        }
    }, [isActive, symbol, timeframe]);

    // Animation loop for playback
    useEffect(() => {
        if (!isPlaying || !isActive) return;

        let animationId: number;
        let lastTime = performance.now();

        const animate = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Advance replay via Rust backend
            advanceReplay(deltaTime).then(update => {
                if (update) {
                    setCurrentIndex(update.currentIndex);
                    setProgress(update.progress);
                    
                    // Stop if at end
                    if (update.currentIndex >= totalCandles - 1) {
                        setIsPlaying(false);
                    }
                }
            });

            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isPlaying, isActive, totalCandles]);

    // Sync with backend state
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            getReplayState().then(state => {
                if (state.isLoaded) {
                    setIsPlaying(state.isPlaying);
                    setCurrentIndex(state.currentIndex);
                    setTotalCandles(state.totalCandles);
                    setSpeed(state.speed);
                    setProgress(state.progress);
                }
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isActive]);

    const handlePlay = useCallback(async () => {
        if (isPlaying) {
            await pauseReplay();
            setIsPlaying(false);
        } else {
            await startReplay();
            setIsPlaying(true);
        }
    }, [isPlaying]);

    const handleStop = useCallback(async () => {
        await stopReplay();
        setIsPlaying(false);
        setCurrentIndex(0);
        setProgress(0);
    }, []);

    const handleStepForward = useCallback(async () => {
        const update = await stepForward(1);
        if (update) {
            setCurrentIndex(update.currentIndex);
            setProgress(update.progress);
        }
    }, []);

    const handleStepBackward = useCallback(async () => {
        const update = await stepBackward(1);
        if (update) {
            setCurrentIndex(update.currentIndex);
            setProgress(update.progress);
        }
    }, []);

    const handleSpeedChange = useCallback(async (newSpeed: number) => {
        await setReplaySpeed(newSpeed);
        setSpeed(newSpeed);
    }, []);

    const handleSeek = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value);
        const update = await seekToIndex(index);
        if (update) {
            setCurrentIndex(update.currentIndex);
            setProgress(update.progress);
        }
    }, []);

    if (!isActive) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-2xl px-6 py-4 flex flex-col gap-3 min-w-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-sm font-medium text-zinc-200">Market Replay</span>
                        <span className="text-xs text-zinc-500 ml-2">{symbol} {timeframe}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-12">{currentIndex}</span>
                    <input
                        type="range"
                        min={0}
                        max={totalCandles - 1}
                        value={currentIndex}
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-xs text-zinc-500 w-12 text-right">{totalCandles}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    {/* Playback Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleStepBackward}
                            disabled={currentIndex <= 0}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Step Backward"
                        >
                            <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                        </button>

                        <button
                            onClick={handlePlay}
                            disabled={!isLoaded}
                            className="p-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isPlaying ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={handleStepForward}
                            disabled={currentIndex >= totalCandles - 1}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Step Forward"
                        >
                            <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>

                        <button
                            onClick={handleStop}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            title="Stop"
                        >
                            <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                        </button>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Speed:</span>
                        {[0.5, 1, 2, 5, 10].map(s => (
                            <button
                                key={s}
                                onClick={() => handleSpeedChange(s)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    speed === s
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>

                    {/* Progress % */}
                    <div className="text-xs text-zinc-500">
                        {Math.round(progress * 100)}%
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReplayControls;