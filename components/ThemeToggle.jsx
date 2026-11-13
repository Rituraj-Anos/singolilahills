import Icon from './Icon.jsx';
import { setTheme, useTheme } from '../lib/theme.js';

export default function ThemeToggle({ className = 'theme-btn' }) {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className={className} onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
