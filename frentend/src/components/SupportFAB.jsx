import Icon from './ui/Icon';

export default function SupportFAB({ onClick }) {
  return (
    <button className="support-fab" onClick={onClick} title="Need help?">
      <span className="fab-pulse"></span>
      <Icon name="headphones" size={24} />
    </button>
  );
}
