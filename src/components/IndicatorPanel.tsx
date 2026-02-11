/**
 * IndicatorPanel Component
 * UI for adding, configuring, and managing technical indicators
 */

import React, { useState, useCallback } from 'react';
import { 
  X, 
  Settings, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingUp,
  BarChart3,
  Activity as VolatilityIcon
} from 'lucide-react';
import type { 
  IndicatorConfig, 
  IndicatorType, 
  IndicatorDefinition 
} from '../types/indicators';
import { 
  INDICATOR_DEFINITIONS, 
  createIndicatorConfig 
} from '../types/indicators';

interface IndicatorPanelProps {
  indicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CATEGORY_ICONS = {
  trend: TrendingUp,
  momentum: Activity,
  volatility: VolatilityIcon,
  volume: BarChart3
};

const CATEGORY_COLORS = {
  trend: 'text-blue-400',
  momentum: 'text-green-400',
  volatility: 'text-purple-400',
  volume: 'text-orange-400'
};

export const IndicatorPanel: React.FC<IndicatorPanelProps> = ({
  indicators,
  onIndicatorsChange,
  isOpen,
  onToggle
}) => {
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group indicators by category
  const groupedIndicators = Object.entries(INDICATOR_DEFINITIONS).reduce(
    (acc, [type, def]) => {
      if (!acc[def.category]) acc[def.category] = [];
      acc[def.category].push({ type: type as IndicatorType, def });
      return acc;
    },
    {} as Record<string, { type: IndicatorType; def: IndicatorDefinition }[]>
  );

  // Add new indicator
  const handleAddIndicator = useCallback((type: IndicatorType) => {
    const newConfig = createIndicatorConfig(type);
    onIndicatorsChange([...indicators, newConfig]);
    setExpandedIndicator(newConfig.id);
    setShowAddMenu(false);
    setSelectedCategory(null);
  }, [indicators, onIndicatorsChange]);

  // Remove indicator
  const handleRemoveIndicator = useCallback((id: string) => {
    onIndicatorsChange(indicators.filter(ind => ind.id !== id));
    if (expandedIndicator === id) {
      setExpandedIndicator(null);
    }
  }, [indicators, onIndicatorsChange, expandedIndicator]);

  // Toggle visibility
  const handleToggleVisibility = useCallback((id: string) => {
    onIndicatorsChange(indicators.map(ind => 
      ind.id === id ? { ...ind, visible: !ind.visible } : ind
    ));
  }, [indicators, onIndicatorsChange]);

  // Update indicator parameter
  const handleParameterChange = useCallback((
    id: string, 
    paramName: string, 
    value: number | string
  ) => {
    onIndicatorsChange(indicators.map(ind => 
      ind.id === id 
        ? { 
            ...ind, 
            parameters: { ...ind.parameters, [paramName]: value } 
          } 
        : ind
    ));
  }, [indicators, onIndicatorsChange]);

  // Update indicator style
  const handleStyleChange = useCallback((
    id: string,
    styleUpdate: Partial<IndicatorConfig['style']>
  ) => {
    onIndicatorsChange(indicators.map(ind => 
      ind.id === id 
        ? { ...ind, style: { ...ind.style, ...styleUpdate } }
        : ind
    ));
  }, [indicators, onIndicatorsChange]);

  return (
    <div className={`
      fixed right-0 top-20 bottom-0 w-80 bg-gray-900 border-l border-gray-800 
      transform transition-transform duration-300 ease-in-out z-40
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Indicators
        </h2>
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Add Button */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 
                     hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Indicator
        </button>
      </div>

      {/* Add Menu */}
      {showAddMenu && (
        <div className="absolute top-32 left-0 right-0 bg-gray-800 border-b border-gray-700 
                        max-h-96 overflow-y-auto">
          {!selectedCategory ? (
            // Category selection
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-400 mb-3">Select a category:</p>
              {Object.entries(groupedIndicators).map(([category, items]) => {
                const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 
                               rounded-lg transition-colors text-left"
                  >
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <div className="flex-1">
                      <span className="text-white capitalize font-medium">
                        {category}
                      </span>
                      <span className="text-gray-500 text-sm ml-2">
                        ({items.length})
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                );
              })}
            </div>
          ) : (
            // Indicator selection within category
            <div className="p-4 space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-3"
              >
                <ChevronUp className="w-4 h-4" />
                Back to categories
              </button>
              <p className="text-sm text-gray-400 capitalize mb-3">
                {selectedCategory} Indicators:
              </p>
              {groupedIndicators[selectedCategory]?.map(({ type, def }) => (
                <button
                  key={type}
                  onClick={() => handleAddIndicator(type)}
                  className="w-full text-left p-3 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-white font-medium block">{def.name}</span>
                  <span className="text-gray-500 text-sm">{def.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Indicators List */}
      <div className="overflow-y-auto flex-1 p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {indicators.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No indicators added</p>
            <p className="text-sm">Click "Add Indicator" to get started</p>
          </div>
        ) : (
          indicators.map((indicator) => {
            const definition = INDICATOR_DEFINITIONS[indicator.type];
            const isExpanded = expandedIndicator === indicator.id;
            
            return (
              <div
                key={indicator.id}
                className={`
                  bg-gray-800 rounded-lg overflow-hidden transition-all
                  ${isExpanded ? 'ring-1 ring-blue-500' : ''}
                `}
              >
                {/* Header */}
                <div className="flex items-center gap-2 p-3">
                  <button
                    onClick={() => handleToggleVisibility(indicator.id)}
                    className={`
                      p-1.5 rounded transition-colors
                      ${indicator.visible ? 'text-blue-400 hover:bg-blue-400/10' : 'text-gray-600 hover:bg-gray-700'}
                    `}
                    title={indicator.visible ? 'Hide' : 'Show'}
                  >
                    {indicator.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => setExpandedIndicator(isExpanded ? null : indicator.id)}
                    className="flex-1 text-left"
                  >
                    <span className="text-white font-medium text-sm">{indicator.name}</span>
                    <span className="text-gray-500 text-xs block">{definition.name}</span>
                  </button>

                  <button
                    onClick={() => handleRemoveIndicator(indicator.id)}
                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded Configuration */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-4 border-t border-gray-700 pt-3">
                    {/* Parameters */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Parameters
                      </h4>
                      {Object.entries(definition.parameters).map(([paramName, paramDef]) => (
                        <div key={paramName}>
                          <label className="text-xs text-gray-500 block mb-1">
                            {paramDef.name}
                          </label>
                          {paramDef.type === 'select' ? (
                            <select
                              value={indicator.parameters[paramName] as string}
                              onChange={(e) => handleParameterChange(indicator.id, paramName, e.target.value)}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 
                                       text-sm text-white focus:border-blue-500 focus:outline-none"
                            >
                              {paramDef.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              value={indicator.parameters[paramName] as number}
                              onChange={(e) => handleParameterChange(indicator.id, paramName, parseFloat(e.target.value))}
                              min={paramDef.min}
                              max={paramDef.max}
                              step={paramDef.step}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 
                                       text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          )}
                          <p className="text-xs text-gray-600 mt-1">{paramDef.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Style */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Style
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={indicator.style.color || '#2196F3'}
                              onChange={(e) => handleStyleChange(indicator.id, { color: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer bg-transparent"
                            />
                            <span className="text-xs text-gray-400">
                              {indicator.style.color || '#2196F3'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Line Width</label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={indicator.style.lineWidth || 2}
                            onChange={(e) => handleStyleChange(indicator.id, { lineWidth: parseInt(e.target.value) })}
                            className="w-full"
                          />
                          <span className="text-xs text-gray-400">{indicator.style.lineWidth || 2}px</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Line Style</label>
                        <div className="flex gap-2">
                          {(['solid', 'dashed', 'dotted'] as const).map(style => (
                            <button
                              key={style}
                              onClick={() => handleStyleChange(indicator.id, { lineStyle: style })}
                              className={`
                                flex-1 py-1.5 px-2 rounded text-xs capitalize
                                ${indicator.style.lineStyle === style 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-900 text-gray-400 hover:bg-gray-700'}
                              `}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default IndicatorPanel;
