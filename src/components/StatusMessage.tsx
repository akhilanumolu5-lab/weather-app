export interface StatusMessageProps {
  message: string;
  variant?: 'info' | 'error';
}

/** Small banner for loading/info/error states, with appropriate ARIA roles for screen readers. */
export function StatusMessage({ message, variant = 'info' }: StatusMessageProps) {
  return (
    <p role={variant === 'error' ? 'alert' : 'status'} className={`status-message status-message--${variant}`}>
      {message}
    </p>
  );
}
