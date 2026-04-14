/**
 * DateRangeSelector Component
 * Agent 4: Visualization & Interaction Expert
 *
 * Flexible date range selection with presets and custom range picker
 */

import React, { useState } from 'react';

export interface DateRange {
  start: Date;
  end: Date;
  preset?: string;
}

interface Props {
  onChange: (range: DateRange) => void;
  defaultPreset?: string;
  showCustom?: boolean;
}

export default function DateRangeSelector({
  onChange,
  defaultPreset = '30d',
  showCustom = true
}: Props) {
  const presets = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'Last 6 months', value: '6m' },
    { label: 'Last year', value: '1y' },
    { label: 'All time', value: 'all' },
    ...(showCustom ? [{ label: 'Custom', value: 'custom' }] : [])
  ];

  const [selectedPreset, setSelectedPreset] = useState(defaultPreset);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const calculateDateRange = (preset: string): DateRange => {
    const end = new Date();
    let start = new Date();

    switch (preset) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '6m':
        start.setMonth(end.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'all':
        start = new Date('2020-01-01'); // Platform start date
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end, preset };
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);

    if (preset === 'custom') {
      setShowCustomPicker(true);
      return;
    }

    setShowCustomPicker(false);
    const range = calculateDateRange(preset);
    onChange(range);
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (start > end) {
      alert('Start date must be before end date');
      return;
    }

    onChange({ start, end, preset: 'custom' });
    setShowCustomPicker(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Time Range:
        </label>

        <div className="flex space-x-2 flex-wrap gap-2">
          {presets.map(preset => (
            <button
              key={preset.value}
              onClick={() => handlePresetChange(preset.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset === preset.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {showCustomPicker && (
        <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <span className="text-gray-500 mt-6">to</span>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <button
            onClick={handleCustomApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mt-6"
          >
            Apply
          </button>

          <button
            onClick={() => {
              setShowCustomPicker(false);
              setSelectedPreset('30d');
              handlePresetChange('30d');
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors mt-6"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
