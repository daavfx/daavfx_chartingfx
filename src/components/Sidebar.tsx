import React from 'react';
import { 
    Crosshair, MousePointer2, TrendingUp, Minus, SeparatorVertical, 
    MoveUpRight, MoveDiagonal, GitBranch, GitMerge, GitFork, 
    Square, Circle, Triangle, AlignCenterHorizontal, Pentagon, 
    Mountain, Waves, Type, StickyNote, MessageSquare, ArrowUpRight, 
    Tag, Ruler, CalendarRange, ArrowBigUp, ArrowBigDown, 
    Magnet, Lock, Eye, Trash2
} from 'lucide-react';
import { ToolType } from '../types';

interface SidebarProps {
    currentTool: ToolType;
    setTool: (t: ToolType) => void;
    onDeleteAll: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTool, setTool, onDeleteAll }) => {
    
    const ToolBtn = ({ tool, icon: Icon, title }: { tool: ToolType, icon: any, title: string }) => {
        const isActive = currentTool === tool;
        return (
            <button 
                onClick={() => setTool(tool)}
                className={`w-full p-2 rounded flex items-center justify-center transition-all duration-150 ease-in-out ${
                    isActive 
                    ? 'bg-blue-500/15 text-blue-500' 
                    : 'text-zinc-400 hover:bg-zinc-800/50'
                }`}
                title={title}
            >
                <Icon size={16} strokeWidth={1.5} />
            </button>
        );
    };

    const Separator = () => <div className="w-6 h-px bg-zinc-800 mx-auto my-2"></div>;

    return (
        <aside className="w-12 border-r border-zinc-800/50 bg-zinc-950/50 flex flex-col py-2 select-none">
            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="crosshair" icon={Crosshair} title="Crosshair" />
                <ToolBtn tool="pointer" icon={MousePointer2} title="Pointer" />
            </div>
            
            <Separator />
            
            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="trendline" icon={TrendingUp} title="Trend Line" />
                <ToolBtn tool="hline" icon={Minus} title="Horizontal Line" />
                <ToolBtn tool="vline" icon={SeparatorVertical} title="Vertical Line" />
                <ToolBtn tool="ray" icon={MoveUpRight} title="Ray" />
                <ToolBtn tool="extended" icon={MoveDiagonal} title="Extended Line" />
            </div>

            <Separator />

            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="fibretracement" icon={GitBranch} title="Fib Retracement" />
                <ToolBtn tool="fibextension" icon={GitMerge} title="Fib Extension" />
                <ToolBtn tool="pitchfork" icon={GitFork} title="Pitchfork" />
            </div>

            <Separator />

            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="rectangle" icon={Square} title="Rectangle" />
                <ToolBtn tool="circle" icon={Circle} title="Circle" />
                <ToolBtn tool="triangle" icon={Triangle} title="Triangle" />
                <ToolBtn tool="channel" icon={AlignCenterHorizontal} title="Parallel Channel" />
            </div>

            <Separator />

            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="xabcd" icon={Pentagon} title="XABCD Pattern" />
                <ToolBtn tool="headshoulders" icon={Mountain} title="Head & Shoulders" />
                <ToolBtn tool="elliott" icon={Waves} title="Elliott Wave" />
            </div>

            <Separator />
            
            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="text" icon={Type} title="Text" />
                <ToolBtn tool="note" icon={StickyNote} title="Note" />
                <ToolBtn tool="callout" icon={MessageSquare} title="Callout" />
                <ToolBtn tool="arrow" icon={ArrowUpRight} title="Arrow" />
                <ToolBtn tool="pricelabel" icon={Tag} title="Price Label" />
            </div>

            <Separator />

            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="pricerange" icon={Ruler} title="Price Range" />
                <ToolBtn tool="daterange" icon={CalendarRange} title="Date Range" />
                <ToolBtn tool="longposition" icon={ArrowBigUp} title="Long Position" />
                <ToolBtn tool="shortposition" icon={ArrowBigDown} title="Short Position" />
            </div>

            <div className="flex-1"></div>

            <div className="px-1.5 space-y-0.5">
                <ToolBtn tool="magnet" icon={Magnet} title="Magnet Mode" />
                <ToolBtn tool="lock" icon={Lock} title="Lock Drawings" />
                <ToolBtn tool="visibility" icon={Eye} title="Show/Hide Drawings" />
                <button 
                    onClick={onDeleteAll}
                    className="w-full p-2 rounded flex items-center justify-center text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
                    title="Delete All"
                >
                    <Trash2 size={16} strokeWidth={1.5} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
