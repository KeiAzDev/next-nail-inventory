'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Slider
} from "@/components/ui/slider"

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  showOpacity?: boolean
}

function parseRGBA(rgba: string) {
  const match = rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

function rgbaToHex({ r, g, b }: { r: number, g: number, b: number }) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRGBA(hex: string, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ColorPicker({ value, onChange, showOpacity = true }: ColorPickerProps) {
  const [color, setColor] = useState(parseRGBA(value));

  // value prop が変更された時に内部の状態を更新
  useEffect(() => {
    setColor(parseRGBA(value));
  }, [value]);

  // カラーコードの変更処理
  const handleHexChange = (hex: string) => {
    const rgba = hexToRGBA(hex, color.a);
    onChange(rgba);
  };

  // 透明度の変更処理
  const handleOpacityChange = (newOpacity: number) => {
    const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${newOpacity})`;
    onChange(rgba);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>カラー</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={rgbaToHex(color)}
              onChange={(e) => handleHexChange(e.target.value)}
              className="w-12 h-9 p-1 cursor-pointer"
              aria-label="カラーピッカー"
            />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>プレビュー</Label>
          <div
            className="h-9 rounded border shadow-sm"
            style={{
              backgroundColor: value,
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%),' +
                'linear-gradient(-45deg, #ccc 25%, transparent 25%),' +
                'linear-gradient(45deg, transparent 75%, #ccc 75%),' +
                'linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          />
        </div>
      </div>

      {showOpacity && (
        <div className="space-y-2">
          <Label>透明度</Label>
          <div className="flex gap-4 items-center">
            <Slider
              value={[color.a * 100]}
              onValueChange={(values) => handleOpacityChange(values[0] / 100)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {Math.round(color.a * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}