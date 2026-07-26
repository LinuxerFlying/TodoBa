import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'default';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'default', size = 'md', className, ...rest }: Props) {
  return (
    <button
      className={cx(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        className
      )}
      {...rest}
    />
  );
}
