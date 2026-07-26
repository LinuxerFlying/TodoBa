import type { InputHTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('ui-input', className)} {...rest} />;
}
