import { useState } from 'react';
import Icon from '../components/ui/Icon';
import { FAQ_ARTICLES } from '../data/faq';

export default function FAQCategoryView({ category, onBack, onChat, showToast }) {
  const [openId, setOpenId] = useState(null);
  const articles = FAQ_ARTICLES[category.slug] || [];

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>{category.name}</h1>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: 14, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={category.icon} size={24} />
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Find solutions to common {category.name.toLowerCase()} related issues.</p>
      </div>
      <div className="faq-list">
        {articles.map(article => (
          <div key={article.id} className={`faq-item ${openId === article.id ? 'open' : ''}`}>
            <button className="faq-question" onClick={() => setOpenId(openId === article.id ? null : article.id)}>
              {article.q}
              <span className="faq-arrow"><Icon name="chevron-down" size={18} /></span>
            </button>
            {openId === article.id && (
              <div className="faq-answer">
                {article.a.split('\n').map((line, i) => {
                  if (line.startsWith('ΓÇó')) return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 8 }}><span>•</span><span>{line.substring(2)}</span></div>;
                  return <p key={i} style={{ marginBottom: 6 }}>{line}</p>;
                })}
                <div className="faq-feedback">
                  <span>Was this helpful?</span>
                  <button className="faq-feedback-btn yes" onClick={() => showToast?.('Thanks — glad this helped!', 'success')}><Icon name="thumbs-up" size={14} /> Yes</button>
                  <button className="faq-feedback-btn no" onClick={onChat}><Icon name="thumbs-down" size={14} /> No</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {articles.length === 0 && <div className="empty-state"><p>No articles found for this category yet.</p></div>}
      </div>
      <div className="faqs-help-banner" style={{ marginTop: 32 }}>
        <div className="help-text">
          <h3>Can't find what you're looking for?</h3>
          <p>Ask our AI assistant and get instant help.</p>
        </div>
        <button className="btn-primary btn-danger" onClick={onChat}><Icon name="message-circle" size={16} /><span>Ask AI Assistant</span></button>
      </div>
    </div>
  );
}
