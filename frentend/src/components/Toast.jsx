import Icon from './ui/Icon';

export default function Toast({ message, visible, type = 'success' }) {
  return (
    <div className={`toast ${visible ? 'show' : ''} toast-${type}`}>
      <Icon name={type === 'error' ? 'alert-triangle' : type === 'warning' ? 'alert-triangle' : 'check-circle'} size={18} color={type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e'} />
      <span>{message}</span>
    </div>
  );
}
