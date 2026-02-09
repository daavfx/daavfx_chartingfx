import React, { useState } from 'react';
import { 
    Search, Layers, PencilRuler, Repeat, Lightbulb, GraduationCap,
    Grid3x3, List as ListIcon, Upload, Trash2, X, Archive, Plus
} from 'lucide-react';
import { VaultItem } from '../types';

interface VaultModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: VaultItem[];
    onLoad: (item: VaultItem) => void;
    onDelete: (id: number) => void;
    onNew: () => void;
}

const VaultModal: React.FC<VaultModalProps> = ({ isOpen, onClose, items, onLoad, onDelete, onNew }) => {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    if (!isOpen) return null;

    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory ? item.category === filterCategory : true;
        return matchesSearch && matchesCategory;
    });

    const selectedItem = items.find(i => i.id === selectedId);

    const getIcon = (cat: string) => {
        switch(cat) {
            case 'drawing': return <PencilRuler size={14} />;
            case 'replay': return <Repeat size={14} />;
            case 'idea': return <Lightbulb size={14} />;
            case 'lesson': return <GraduationCap size={14} />;
            default: return <Layers size={14} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 animate-fadeIn" onClick={onClose} />
            <div className="relative w-full max-w-6xl h-[80vh] bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden animate-slideUp shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Archive size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white tracking-tight">Trading Vault</h2>
                            <p className="text-xs text-zinc-500">Your saved analyses, drawings, and trading data</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onNew} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors">
                            <Plus size={14} />
                            New Entry
                        </button>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-56 border-r border-zinc-800 p-4 flex flex-col bg-zinc-900/50">
                        <div className="relative mb-4">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                                type="text" 
                                placeholder="Search vault..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                            />
                        </div>

                        <div className="space-y-1 mb-4">
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-2">Categories</span>
                            <button onClick={() => setFilterCategory(null)} className={`w-full flex items-center gap-2 px-2 py-2 text-xs rounded-lg transition-colors ${!filterCategory ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
                                <Layers size={14} /> All Items
                            </button>
                            <button onClick={() => setFilterCategory('drawing')} className={`w-full flex items-center gap-2 px-2 py-2 text-xs rounded-lg transition-colors ${filterCategory === 'drawing' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
                                <PencilRuler size={14} /> Drawings
                            </button>
                            <button onClick={() => setFilterCategory('replay')} className={`w-full flex items-center gap-2 px-2 py-2 text-xs rounded-lg transition-colors ${filterCategory === 'replay' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
                                <Repeat size={14} /> Replay
                            </button>
                        </div>
                    </div>

                    {/* Grid/List View */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/30">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Sort by:</span>
                                <select className="h-7 px-2 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none">
                                    <option>Date Created</option>
                                    <option>Name A-Z</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    <Grid3x3 size={14} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    <ListIcon size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredItems.map(item => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedId(item.id)}
                                            className={`p-4 bg-zinc-800/30 border rounded-xl cursor-pointer transition-all ${selectedId === item.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-800 hover:bg-zinc-800/50'}`}
                                        >
                                            <div className="aspect-video bg-zinc-900 rounded-lg mb-3 flex items-center justify-center">
                                                {getIcon(item.category)}
                                            </div>
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="text-sm font-medium text-white line-clamp-1">{item.title}</h3>
                                                <span className={`w-2 h-2 bg-${item.color}-500 rounded-full flex-shrink-0 mt-1.5`}></span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-300 rounded">{item.asset}</span>
                                                <span className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-300 rounded">{item.timeframe}</span>
                                            </div>
                                            <p className="text-xs text-zinc-500 line-clamp-2">{item.notes}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {filteredItems.map(item => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedId(item.id)}
                                            className={`flex items-center gap-4 p-3 bg-zinc-800/30 border rounded-lg cursor-pointer transition-all ${selectedId === item.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-800 hover:bg-zinc-800/50'}`}
                                        >
                                            <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
                                                {getIcon(item.category)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                                                    <span className={`w-2 h-2 bg-${item.color}-500 rounded-full`}></span>
                                                </div>
                                                <p className="text-xs text-zinc-500 truncate">{item.notes}</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                <span>{item.asset}</span>
                                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Panel */}
                    {selectedItem && (
                        <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-4 flex flex-col animate-slideLeft">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-white">Details</h3>
                                <button onClick={() => setSelectedId(null)} className="p-1 text-zinc-400 hover:text-white"><X size={14} /></button>
                            </div>
                            <h4 className="text-lg font-medium text-white mb-2">{selectedItem.title}</h4>
                            <p className="text-xs text-zinc-400 mb-4">{selectedItem.notes}</p>
                            
                            <div className="mt-auto flex gap-2">
                                <button onClick={() => { onLoad(selectedItem); onClose(); }} className="flex-1 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                                    Load
                                </button>
                                <button onClick={() => onDelete(selectedItem.id)} className="px-3 py-2 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VaultModal;