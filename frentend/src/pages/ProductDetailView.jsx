import { useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';
import { useInView, useRafCount } from '../hooks/animations';

export default function ProductDetailView({ product, onBack, onWarrantyClaim, onRenewAMC }) {
  const warrantyPercent = Math.round((1 - product.warrantyDays / product.warrantyTotal) * 100);
  const amcPercent = product.amcDays > 0 ? Math.round((1 - product.amcDays / product.amcTotal) * 100) : 0;

  const [progressRef, progressInView] = useInView({ threshold: 0.12 });
  const warrantyCount = useRafCount(progressInView ? product.warrantyDays : 0, 1200);
  const amcCount = useRafCount(progressInView ? product.amcDays : 0, 1200);
  const imageRef = useRef(null);

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (!imageRef.current) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || window.pageYOffset;
        const translate = Math.max(-20, Math.min(20, y * 0.15));
        imageRef.current.style.transform = `translateY(${translate}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Product Details</h1>
      </div>
      <div className="product-detail-hero">
        <img ref={imageRef} src={product.image} alt={product.name} className="product-detail-image" />
        <div className="product-detail-info">
          <div className="product-detail-name">{product.name}</div>
          <div className="product-detail-serial">Serial No: {product.serial}</div>
          <span className={`badge ${product.status === 'Active' ? 'badge-green' : 'badge-amber'}`}>{product.status}</span>
          <div className="product-status-cards" style={{ marginTop: 16 }}>
            <div className="product-status-card">
              <div className="status-label">Warranty</div>
              <span className={`badge ${product.warranty === 'Active' ? 'badge-green' : 'badge-amber'}`}>{product.warranty}</span>
              <div className="status-days">{warrantyCount} days remaining</div>
              <div className="progress-wrap" ref={progressRef}>
                <div className="progress-bar"><div className={`progress-fill ${product.warrantyDays > 60 ? 'green' : 'amber'}`} style={{ transform: progressInView ? `scaleX(${Math.max(0, Math.min(1, warrantyPercent / 100))})` : 'scaleX(0)' }}></div></div>
              </div>
            </div>
            <div className="product-status-card">
              <div className="status-label">AMC</div>
              <span className={`badge ${product.amc === 'Active' ? 'badge-green' : product.amc === 'Inactive' ? 'badge-gray' : 'badge-amber'}`}>{product.amc}</span>
              <div className="status-days">{amcCount > 0 ? `${amcCount} days remaining` : 'Not active'}</div>
              {product.amcDays > 0 && (
                <div className="progress-wrap">
                  <div className="progress-bar"><div className={`progress-fill ${product.amcDays > 60 ? 'green' : 'amber'}`} style={{ transform: progressInView ? `scaleX(${Math.max(0, Math.min(1, amcPercent / 100))})` : 'scaleX(0)' }}></div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <h3 className="quick-actions-title">Quick Actions</h3>
      <div className="quick-actions-list">
        <div className="quick-action-item" onClick={onWarrantyClaim}><Icon name="upload" size={18} /><span>Raise Warranty Claim</span></div>
        <div className="quick-action-item"><Icon name="activity" size={18} /><span>Raise AMC Service Request</span></div>
        <div className="quick-action-item" onClick={onRenewAMC}><Icon name="shield" size={18} /><span>Renew AMC</span></div>
        <div className="quick-action-item"><Icon name="alert-triangle" size={18} /><span>Raise General Complaint</span></div>
      </div>
    </div>
  );
}
