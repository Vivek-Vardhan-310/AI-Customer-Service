import { useState, useEffect, useRef } from 'react';
import Icon from './ui/Icon';

export default function FloatingDock({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'products', label: 'Products', icon: 'laptop' },
    { id: 'tickets', label: 'Tickets', icon: 'ticket' },
    { id: 'faqs', label: 'FAQs', icon: 'help-circle' },
  ];
  const containerRef = useRef(null);
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      const nodes = container.querySelectorAll('.dock-tab');
      const activeIndex = tabs.findIndex(t => t.id === activeTab);
      const node = nodes[activeIndex];
      if (node) {
        const rect = node.getBoundingClientRect();
        const parentRect = container.getBoundingClientRect();
        const x = rect.left - parentRect.left + (rect.width - rect.width) * 0; // left offset
        setIndicator({ x, width: rect.width });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeTab]);

  return (
    <nav className="floating-dock" ref={containerRef}>
      <div className="active-indicator" style={{ transform: `translateX(${indicator.x}px)`, width: indicator.width ? `${indicator.width}px` : undefined }} />
      {tabs.map(tab => (
        <button key={tab.id} className={`dock-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onTabChange(tab.id)}>
          <span className="dock-tab-icon"><Icon name={tab.icon} size={20} /></span>
          <span className="dock-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
