import { Camera, Palette } from 'lucide-react';
import type { BusinessType } from '../types';

export function BusinessTypeSelector({ value, onChange }: { value: BusinessType; onChange: (value: BusinessType) => void }) {
  return (
    <div className="business-selector" role="radiogroup" aria-label="业务类型">
      <button className={value === 'diy' ? 'selected' : ''} type="button" role="radio" aria-checked={value === 'diy'} onClick={() => onChange('diy')}>
        <Palette size={21} /><span><strong>手作DIY</strong><small>团建、员工、节日与暖场活动</small></span>
      </button>
      <button className={value === 'photobooth' ? 'selected' : ''} type="button" role="radio" aria-checked={value === 'photobooth'} onClick={() => onChange('photobooth')}>
        <Camera size={21} /><span><strong>Photobooth</strong><small>年会、婚礼与品牌拍照互动</small></span>
      </button>
    </div>
  );
}

