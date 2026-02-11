import React, { useState } from 'react';
import { X, BookmarkPlus, PencilRuler, Repeat, Lightbulb, GraduationCap, Check } from 'lucide-react';

interface SaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<'drawing' | 'replay' | 'idea' | 'lesson'>('drawing');
    const [tags, setTags] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const availableTags = ['breakout', 'support', 'resistance', 'reversal', 'fibonacci', 'pattern', 'trend'];

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            setTags(tags.filter(t => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const handleSave = () => {
        if (!title) return;
        onSave({ title, category, tags, notes });
        // Reset form
        setTitle('');
        setCategory('drawing');
        setTags([]);
        setNotes('');
    };

    const CategoryBtn = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
        <button 
            onClick={() => setCategory(id)}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs border rounded-lg transition-colors ${
                category === id 
                ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
        >
            <Icon size={14} />
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 animate-fadeIn" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-slideUp shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <BookmarkPlus size={18} className="text-blue-400" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Save to Vault</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Title *</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., EUR/USD Breakout Setup" 
                            className="w-full h-10 px-3 text-sm bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Category *</label>
                        <div className="grid grid-cols-2 gap-2">
                            <CategoryBtn id="drawing" icon={PencilRuler} label="Drawing Analysis" />
                            <CategoryBtn id="replay" icon={Repeat} label="Replay Session" />
                            <CategoryBtn id="idea" icon={Lightbulb} label="Trade Idea" />
                            <CategoryBtn id="lesson" icon={GraduationCap} label="Lesson Learned" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Tags</label>
                        <div className="flex flex-wrap gap-1.5">
                            {availableTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        tags.includes(tag)
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    {tags.includes(tag) ? '✓ ' : '+ '}{tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Notes</label>
                        <textarea 
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any observations, reasoning, or lessons..." 
                            className="w-full px-3 py-2 text-sm bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800 bg-zinc-900/50">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!title}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors ${
                            title ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-800 cursor-not-allowed text-zinc-500'
                        }`}
                    >
                        <Check size={14} />
                        Save to Vault
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveModal;