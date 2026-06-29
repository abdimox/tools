import type { BusinessType, SceneType } from '../types';
import { scenesByBusiness } from '../types';

export function SceneSelector({ businessType, value, onChange }: { businessType: BusinessType; value: SceneType | ''; onChange: (scene: SceneType) => void }) {
  const options = scenesByBusiness[businessType];
  return (
    <div className="scene-field">
      <select value={value} onChange={(event) => onChange(event.target.value as SceneType)} aria-label="活动场景">
        <option value="">请选择活动场景</option>
        {options.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.description}</option>)}
      </select>
      <p>场景由你明确选择，AI不会自行更改。</p>
    </div>
  );
}
