import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'muted';
}

export function Badge({ tone = 'default', className, ...rest }: Props) {
  return <span className={cx('badge', `badge-${tone}`, className)} {...rest} />;
}
