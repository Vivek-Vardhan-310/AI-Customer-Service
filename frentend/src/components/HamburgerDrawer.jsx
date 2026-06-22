import Icon from './ui/Icon';

export default function HamburgerDrawer({ onClose, onOpenLanguage, onOpenAboutAI, onOpenTelecom, onOpenTOS, onOpenPrivacy }) {
  const items = [
    { img: '/images/lang.svg', title: 'Language / हिंदी', desc: '', onClick: () => { onClose(); onOpenLanguage?.(); } },
    { img: '/images/ai.svg', title: 'About Our AI', desc: 'Our technology & how it works', onClick: () => { onClose(); onOpenAboutAI?.(); } },
    { img: '/images/telecom.svg', title: 'Telecom Solutions (B2B)', desc: 'Explore our enterprise solutions', onClick: () => { onClose(); onOpenTelecom?.(); } },
    { img: '/images/terms.svg', title: 'Terms of Service', desc: 'Read our terms', onClick: () => { onClose(); onOpenTOS?.(); } },
    { img: '/images/privacy.svg', title: 'Privacy Policy', desc: 'Your data privacy matters', onClick: () => { onClose(); onOpenPrivacy?.(); } },
  ];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-header">
          <button className="btn-icon" onClick={onClose}><Icon name="x" size={22} /></button>
        </div>
        <div className="drawer-body">
          {items.map((item, i) => (
            <div key={i} className="drawer-item" onClick={item.onClick}>
              <img src={item.img} alt={item.title} className="drawer-item-thumb" />
              <div className="drawer-item-text">
                <span>{item.title}</span>
                {item.desc && <small>{item.desc}</small>}
              </div>
              <Icon name="chevron-right" size={16} color="#8a8a8a" />
            </div>
          ))}
        </div>
        <div className="drawer-footer">© 2026 LaptopCare Support</div>
      </div>
    </>
  );
}
