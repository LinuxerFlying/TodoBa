interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function ProgressSlider({ value, onChange }: Props) {
  return (
    <div className="editor-progress">
      <span className="editor-meta-label">进度</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="editor-progress-val">{value}%</span>
    </div>
  );
}
