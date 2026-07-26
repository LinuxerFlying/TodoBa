import type { SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('ui-select', className)} {...rest}>
      {children}
    </select>
  );
}
