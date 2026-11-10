import Link from 'next/link';
import Icon from './Icon.jsx';

// Primary pill: label, then a disc whose colour floods the pill on hover while the arrow swaps.
export default function ArrowButton({ href, children, variant, type, onClick, disabled, external, className = '', ...rest }) {
  const cls = `btn${variant ? ` btn-${variant}` : ''} ${className}`.trim();
  const inner = (
    <>
      <span className="btn-fill" aria-hidden="true" />
      <span className="btn-label">{children}</span>
      <span className="btn-disc" aria-hidden="true">
        <Icon name="arrow" className="arrow-out" />
        <Icon name="arrow" className="arrow-in" />
      </span>
    </>
  );
  if (!href)
    return (
      <button type={type || 'button'} className={cls} onClick={onClick} disabled={disabled} {...rest}>
        {inner}
      </button>
    );
  if (external)
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        {inner}
      </a>
    );
  return (
    <Link href={href} className={cls} {...rest}>
      {inner}
    </Link>
  );
}
