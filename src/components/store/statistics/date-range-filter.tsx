// src/components/store/statistics/date-range-filter.tsx
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface DateRangeFilterProps {
  startDate: string;
  endDate?: string;
  rangeType: 'single' | 'range';
  onRangeTypeChange: (type: 'single' | 'range') => void;
  onDateChange: (start: string, end?: string) => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  rangeType,
  onRangeTypeChange,
  onDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="mb-6 space-y-4">
      <div>
        <Label>表示期間</Label>
        <Select
          value={rangeType}
          onValueChange={(value: 'single' | 'range') => onRangeTypeChange(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">単一月</SelectItem>
            <SelectItem value="range">期間指定</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 items-end">
        <div>
          <Label>開始月</Label>
          <input
            type="month"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="h-9 w-full rounded-md border border-input bg-white px-3 py-1"
          />
        </div>
        
        {rangeType === 'range' && (
          <div>
            <Label>終了月</Label>
            <input
              type="month"
              value={endDate}
              min={startDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-white px-3 py-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}