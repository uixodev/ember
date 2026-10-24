import type { ButtonHTMLAttributes } from 'react';
import './ui.css';

type Variant = 'white' | 'navy' | 'sun' | 'glass' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  small?: boolean;
}

export function Button({ variant = 'white', block, small, className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${small ? ' btn-small' : ''} ${className}`}
      {...rest}
    />
  );
}

export function IconButton({ label, className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type={type} aria-label={label} className={`icon-btn ${className}`} {...rest} />;
}
