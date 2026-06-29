import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import { fetchFAQCategories } from '../lib/supabase';

export default function FAQsPage({ onSelectCategory, onChat, showToast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFAQCategories().then(data => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="faqs-hero">
        <div className="faqs-avatar">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D" /><circle cx="18" cy="20" r="3" fill="#131414" /><circle cx="30" cy="20" r="3" fill="#131414" /><path d="M16 30c0-4 4-6 8-6s8 2 8 6" stroke="#131414" strokeWidth="2.5" strokeLinecap="round" /></svg>
          <div className="faqs-avatar-wave"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
        <h1>How can we help?</h1>
        <p>Browse FAQs or chat with our AI assistant for quick solutions.</p>
      </div>
      <div className="faqs-search">
        <span className="search-icon"><Icon name="search" size={18} /></span>
        <input type="text" placeholder="Search FAQs..." />
      </div>
      {loading && <div className="empty-state"><p>Loading FAQ categories...</p></div>}
      <div className="faqs-category-grid">
        {categories.map((cat, i) => (
          <div key={cat.slug} className={`faq-category-card animate-in stagger-${i + 1}`} onClick={() => onSelectCategory(cat)}>
            <div className="faq-category-icon"><Icon name={cat.icon} size={20} /></div>
            <span className="faq-category-name">{cat.name}</span>
          </div>
        ))}
      </div>
      <div className="faqs-help-banner">
        <div className="help-text">
          <h3>Still need help?</h3>
          <p>Chat with our AI assistant for personalized support.</p>
        </div>
        <button className="btn-primary" onClick={onChat}><Icon name="message-circle" size={16} /><span>Chat With AI</span></button>
      </div>
    </div>
  );
}
