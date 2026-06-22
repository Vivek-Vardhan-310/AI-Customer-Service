import Icon from './Icon';

export default function InfoModal({ title, imageSrc, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" size={18} /></button>
        <div className="info-modal-top">
          {imageSrc && <img src={imageSrc} alt={title} className="info-modal-img" />}
          <div>
            <h3 style={{ margin: 0 }}>{title}</h3>
          </div>
        </div>
        <div className="info-modal-body">{children}</div>
      </div>
    </div>
  );
}
