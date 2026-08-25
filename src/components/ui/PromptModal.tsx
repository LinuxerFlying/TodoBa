import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface PromptOptions {
  title: string;
  label?: string;
  initialValue?: string;
  placeholder?: string;
  okText?: string;
  cancelText?: string;
  hint?: string;
}

interface Props extends PromptOptions {
  open: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  open,
  title,
  label,
  initialValue = '',
  placeholder,
  okText = '确定',
  cancelText = '取消',
  hint,
  onConfirm,
  onCancel
}: Props) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(value);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, value, onConfirm]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant="primary" onClick={() => onConfirm(value)}>
            {okText}
          </Button>
        </>
      }
    >
      {label && <div style={{ marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>}
      <input
        ref={inputRef}
        className="ui-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      {hint && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-faint)' }}>{hint}</div>
      )}
    </Modal>
  );
}
