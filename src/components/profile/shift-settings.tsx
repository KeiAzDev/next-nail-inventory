// /src/components/profile/shift-settings.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { UpdateStaffProfileRequest } from '@/types/api'

type DayType = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

const DAYS: { key: DayType; label: string }[] = [
  { key: 'monday', label: '月曜日' },
  { key: 'tuesday', label: '火曜日' },
  { key: 'wednesday', label: '水曜日' },
  { key: 'thursday', label: '木曜日' },
  { key: 'friday', label: '金曜日' },
  { key: 'saturday', label: '土曜日' },
  { key: 'sunday', label: '日曜日' },
]

interface ShiftSettingsProps {
  currentShifts: NonNullable<UpdateStaffProfileRequest['shifts']>
  onUpdate: (shifts: NonNullable<UpdateStaffProfileRequest['shifts']>) => void
}

export default function ShiftSettings({ currentShifts, onUpdate }: ShiftSettingsProps) {
  const handleShiftChange = (
    day: DayType,
    field: 'start' | 'end' | 'isOff',
    value: string | boolean
  ) => {
    const newShifts = {
      ...currentShifts,
      [day]: {
        ...currentShifts[day],
        [field]: value,
      },
    }
    onUpdate(newShifts)
  }

  return (
    <div className="space-y-4">
      {DAYS.map(({ key, label }) => (
        <div key={key} className="flex items-start space-x-4 p-4 border rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${key}-off`}
              checked={currentShifts[key]?.isOff ?? false}
              onChange={(e) => 
                handleShiftChange(key, 'isOff', e.target.checked)
              }
            />
            <Label htmlFor={`${key}-off`}>{label}：休み</Label>
          </div>
          
          {!currentShifts[key]?.isOff && (
            <div className="flex items-center space-x-2 flex-1">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                  <Label htmlFor={`${key}-start`}>開始時間</Label>
                  <Input
                    id={`${key}-start`}
                    type="time"
                    value={currentShifts[key]?.start ?? ''}
                    onChange={(e) => handleShiftChange(key, 'start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${key}-end`}>終了時間</Label>
                  <Input
                    id={`${key}-end`}
                    type="time"
                    value={currentShifts[key]?.end ?? ''}
                    onChange={(e) => handleShiftChange(key, 'end', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}