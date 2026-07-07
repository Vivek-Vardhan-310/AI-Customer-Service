import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/ui/Icon';
import { createTicket } from '../lib/supabase';

export default function CreateTicketWizard({
  products = [],
  showToast,
  refreshTickets,
  onComplete,
  onBack,
}) {
  const [step, setStep] = useState(1);

  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const selectedProduct = useMemo(
    () => products.find(p => String(p.id) === String(selectedProductId)) || null,
    [products, selectedProductId]
  );

  const REQUEST_TYPES = [
    { id: 'general_complaint', title: 'General Complaint', icon: 'alert-triangle' },
    { id: 'warranty_claim', title: 'Warranty Claim', icon: 'shield' },
    { id: 'amc_service_request', title: 'AMC Service Request', icon: 'activity' },
    { id: 'renew_amc', title: 'Renew AMC', icon: 'refresh-cw' },
  ];

  const [ticketType, setTicketType] = useState('');

  // Dynamic form state
  const [issueCategory, setIssueCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [contactMethod, setContactMethod] = useState('email');

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  const [files, setFiles] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [warrantyEvidence, setWarrantyEvidence] = useState([]);
  const [invoiceUploads, setInvoiceUploads] = useState([]);

  const [serviceType, setServiceType] = useState('General Maintenance');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Renew AMC mock fields (kept UI-only)
  const [currentAmc, setCurrentAmc] = useState('Inactive');
  const [availablePlans, setAvailablePlans] = useState([
    { id: 'basic', name: 'Basic AMC', price: '₹999 / year', highlighted: false },
    { id: 'premium', name: 'Premium AMC', price: '₹1,999 / year', highlighted: true },
    { id: 'enterprise', name: 'Enterprise AMC', price: '₹2,999 / year', highlighted: false },
  ]);
  const [planComparison, setPlanComparison] = useState('Premium includes priority support + annual maintenance.');
  const [renewalPrice, setRenewalPrice] = useState('₹1,999 / year');

  const [selectedPlanId, setSelectedPlanId] = useState('premium');
  const selectedPlan = useMemo(
    () => availablePlans.find(p => p.id === selectedPlanId) || availablePlans[0],
    [availablePlans, selectedPlanId]
  );
  const benefits = useMemo(
    () => ['Free Service Visits', 'Priority Support', 'Genuine Parts', 'Annual Maintenance'],
    []
  );

  const [estimatedResponseTime, setEstimatedResponseTime] = useState('');
  const [supportLevel, setSupportLevel] = useState('');

  const fileRefImages = useRef(null);
  const fileRefDocs = useRef(null);
  const fileRefEvidence = useRef(null);
  const fileRefInvoice = useRef(null);

  const stepLabels = ['Select Product', 'Select Request Type', 'Fill Details', 'Review & Submit'];

  useEffect(() => {
    if (!selectedProduct) return;
    setCurrentAmc(selectedProduct.amc || 'Inactive');
  }, [selectedProduct]);

  useEffect(() => {
    // Update estimated response time & support level based on ticket type + priority.
    if (!ticketType) {
      setEstimatedResponseTime('');
      setSupportLevel('');
      return;
    }

    const priorityToSLA = {
      Low: '48–72 hours',
      Medium: '24–48 hours',
      High: '12–24 hours',
      Urgent: '4–12 hours',
    };

    const base = priorityToSLA[priority] || '24–48 hours';

    const support = ticketType === 'warranty_claim' ? 'Warranty Desk' : ticketType === 'renew_amc' ? 'AMC Renewals' : 'Support Desk';
    setEstimatedResponseTime(base);
    setSupportLevel(support);
  }, [ticketType, priority]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => {
      const hay = `${p.name || ''} ${p.model || ''} ${p.serial || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, query]);

  const handleStep1Continue = () => {
    if (!selectedProductId) {
      showToast?.('Select a product to continue.', 'warning');
      return;
    }
    setStep(2);
  };

  const handleStep2Continue = () => {
    if (!ticketType) {
      showToast?.('Select a request type to continue.', 'warning');
      return;
    }
    setStep(3);
  };

  const handleSaveDraft = () => {
    showToast?.('Draft saved (local only).', 'success');
  };

  const resetStep3StateForType = (type) => {
    // Keep user choice but reset unrelated fields.
    setIssueCategory('');
    setPriority('Medium');
    setDescription('');
    setContactMethod('email');
    setVoiceEnabled(false);
    setVoiceText('');

    setFiles([]);
    setDocuments([]);

    setWarrantyEvidence([]);
    setInvoiceUploads([]);

    setServiceType('General Maintenance');
    setPreferredDate('');
    setPreferredTime('');
    setAdditionalInstructions('');

    setSelectedPlanId('premium');
    setRenewalPrice('₹1,999 / year');
    setPlanComparison('Premium includes priority support + annual maintenance.');

    setEstimatedResponseTime('');
    setSupportLevel('');

    if (type === 'renew_amc') {
      setCurrentAmc(selectedProduct?.amc || 'Inactive');
    }
  };

  useEffect(() => {
    if (!ticketType) return;
    resetStep3StateForType(ticketType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketType]);

  const handleSubmit = async () => {
    if (!selectedProduct || !ticketType) {
      showToast?.('Please complete Step 1 and Step 2 before submitting.', 'warning');
      return;
    }

    const computedDescription = voiceEnabled && voiceText ? `${description}${description ? '\n' : ''}${voiceText}`.trim() : description;

    const payload = {
      productId: selectedProduct.id,
      // Existing backend currently stores generic fields; map to best-effort.
      title: `${selectedProduct.name} - ${REQUEST_TYPES.find(t => t.id === ticketType)?.title || 'Ticket'}`,
      ticket_type: ticketType,
      category: issueCategory || (ticketType === 'warranty_claim' ? 'Warranty' : ticketType === 'renew_amc' ? 'AMC Renewal' : 'General'),
      priority: priority,
      description: computedDescription || (ticketType === 'renew_amc' ? `Renew AMC plan: ${selectedPlan?.name || ''}` : ''),
      contactMethod,
      preferred_contact: contactMethod,
      // Attachments
      attachments: {
        images: files.map(f => ({ name: f.name })),
        documents: documents.map(f => ({ name: f.name })),
        evidence: warrantyEvidence.map(f => ({ name: f.name })),
        invoice: invoiceUploads.map(f => ({ name: f.name })),
      },
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      service_type: serviceType,
      additional_instructions: additionalInstructions,
      // Renew AMC
      current_amc: currentAmc,
      available_amc_plans: availablePlans,
      selected_amc_plan: selectedPlan,
      plan_comparison: planComparison,
      renewal_price: renewalPrice,
      benefits,
      status: 'Open',
      estimated_response_time: estimatedResponseTime,
      support_level: supportLevel,
    };

    try {
      const result = await createTicket({
        productId: payload.productId,
        title: payload.title,
        category: payload.category,
        description: payload.description,
        contactMethod: payload.contactMethod,
        ticket_type: payload.ticket_type,
        priority: payload.priority,
        attachments: payload.attachments,
        preferred_contact: payload.preferred_contact,
        status: payload.status,
      });

      if (result) {
        showToast?.('Ticket submitted successfully.', 'success');
        refreshTickets?.();
        onComplete?.(result.id);
        return;
      }

      const ticketId = `CS-${9100 + Math.floor(Math.random() * 900)}`;
      showToast?.('Ticket submitted! Ticket: ' + ticketId, 'success');
      refreshTickets?.();
      onComplete?.(ticketId);
    } catch (e) {
      console.error(e);
      showToast?.('Failed to submit ticket. Please try again.', 'error');
    }
  };

  const canGoNextFromStep3 = () => {
    if (!selectedProduct || !ticketType) return false;
    if (ticketType === 'renew_amc') return true;
    if (ticketType === 'amc_service_request') {
      if (!preferredDate || !preferredTime) return false;
      return true;
    }
    if (ticketType === 'warranty_claim') {
      if (!description.trim()) return false;
      return true;
    }
    // general complaint
    if (!description.trim()) return false;
    return true;
  };

  return (
    <div className="raise-ticket-form animate-in">
      <div className="detail-header">
        <button className="back-btn" onClick={() => onBack?.()}><Icon name="arrow-left" size={20} /></button>
        <h1>Create Ticket</h1>
      </div>

      <div className="wizard-header">
        {stepLabels.map((label, i) => (
          <div key={label} className="wizard-step" style={{ marginRight: i === stepLabels.length - 1 ? 0 : undefined }}>
            <div className={`wizard-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}>
              <div className="wizard-step-number">
                {step > i + 1 ? <Icon name="check" size={14} color="white" /> : i + 1}
              </div>
              <span className="wizard-step-label">{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`wizard-step-line ${step > i + 1 ? 'completed' : step === i + 2 ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>

      <div className="wizard-body" style={{ marginTop: 0 }}>
        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Select Product</label>
              <div className="products-search" style={{ marginBottom: 0, marginTop: 10 }}>
                <span className="search-icon"><Icon name="search" size={18} /></span>
                <input type="text" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>

              <div style={{ marginTop: 12 }}>
                <select
                  className="form-input"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  aria-label="Select Product"
                >
                  <option value="">Select Product</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProduct && (
              <div className="raise-ticket-product" style={{ marginTop: 10 }}>
                <img src={selectedProduct.image} alt={selectedProduct.name} />
                <div className="raise-ticket-product-info" style={{ flex: 1 }}>
                  <h3>{selectedProduct.name}</h3>
                  <p>Serial Number: {selectedProduct.serial}</p>
                  <div className="raise-ticket-badges" style={{ marginTop: 10 }}>
                    <span className={`badge ${selectedProduct.warranty === 'Active' || selectedProduct.warranty === 'Active' ? 'badge-green' : 'badge-amber'}`}>Warranty {selectedProduct.warranty}</span>
                    {selectedProduct.amc && selectedProduct.amc !== 'Inactive' ? (
                      <span className={`badge ${selectedProduct.amc === 'Active' ? 'badge-green' : 'badge-amber'}`}>AMC {selectedProduct.amc}</span>
                    ) : (
                      <span className={`badge badge-gray`}>AMC Inactive</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purchase Date</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{selectedProduct.purchaseDate || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Warranty Expiry</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{selectedProduct.warranty === 'Active' || selectedProduct.warranty === 'Expiring Soon' ? `${selectedProduct.warrantyDays} days` : 'Expired'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AMC Expiry</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{selectedProduct.amcDays > 0 ? `${selectedProduct.amcDays} days` : 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Warranty Status</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{selectedProduct.warranty}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Select Request Type</label>
            </div>

            <div className="category-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {REQUEST_TYPES.map(t => (
                <div
                  key={t.id}
                  className={`category-card ${ticketType === t.id ? 'selected' : ''}`}
                  onClick={() => setTicketType(t.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="category-card-icon"><Icon name={t.icon} size={22} /></div>
                  <span className="category-card-label">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            {ticketType === 'general_complaint' && (
              <>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Issue Category</label>
                  <input className="form-input" value={issueCategory} onChange={(e) => setIssueCategory(e.target.value)} placeholder="e.g., Battery issue, Software problem" />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Priority</label>
                  <div className="category-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                      <div key={p} className={`category-card ${priority === p ? 'selected' : ''}`} onClick={() => setPriority(p)}>
                        <span className="category-card-label">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input textarea" placeholder="Describe the issue..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Voice Input</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className={`btn-secondary`}
                      onClick={() => setVoiceEnabled(v => !v)}
                      type="button"
                    >
                      <Icon name="mic" size={16} />
                      {voiceEnabled ? 'Voice On' : 'Voice Off'}
                    </button>
                    {voiceEnabled && (
                      <input className="form-input" value={voiceText} onChange={(e) => setVoiceText(e.target.value)} placeholder="Type or paste voice transcript..." />
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Upload Images</label>
                  <input type="file" ref={fileRefImages} style={{ display: 'none' }} multiple accept="image/*" onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
                  <button className="btn-secondary" type="button" onClick={() => fileRefImages.current?.click()}>
                    <Icon name="paperclip" size={16} /> Choose Images
                  </button>
                  {files.length > 0 && <div className="error-text" style={{ color: 'var(--text-muted)', marginTop: 8 }}>{files.length} image(s) selected</div>}
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Upload Documents</label>
                  <input type="file" ref={fileRefDocs} style={{ display: 'none' }} multiple onChange={(e) => setDocuments([...documents, ...Array.from(e.target.files)])} />
                  <button className="btn-secondary" type="button" onClick={() => fileRefDocs.current?.click()}>
                    <Icon name="paperclip" size={16} /> Choose Documents
                  </button>
                  {documents.length > 0 && <div className="error-text" style={{ color: 'var(--text-muted)', marginTop: 8 }}>{documents.length} document(s) selected</div>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Preferred Contact Method</label>
                  <div className="contact-methods">
                    {['email', 'phone', 'whatsapp'].map(m => (
                      <div key={m} className={`contact-method ${contactMethod === m ? 'selected' : ''}`} onClick={() => setContactMethod(m)}>
                        <Icon name={m === 'email' ? 'mail' : m === 'phone' ? 'phone' : 'message-circle'} size={20} />
                        <span className="contact-method-label">{m[0].toUpperCase() + m.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {ticketType === 'warranty_claim' && (
              <>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Issue Category</label>
                  <input className="form-input" value={issueCategory} onChange={(e) => setIssueCategory(e.target.value)} placeholder="e.g., Display issue, Hardware failure" />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input textarea" placeholder="Explain the issue..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Upload Evidence</label>
                  <input type="file" ref={fileRefEvidence} style={{ display: 'none' }} multiple accept="image/*" onChange={(e) => setWarrantyEvidence([...warrantyEvidence, ...Array.from(e.target.files)])} />
                  <button className="btn-secondary" type="button" onClick={() => fileRefEvidence.current?.click()}>
                    <Icon name="paperclip" size={16} /> Choose Evidence
                  </button>
                  {warrantyEvidence.length > 0 && <div className="error-text" style={{ color: 'var(--text-muted)', marginTop: 8 }}>{warrantyEvidence.length} file(s) selected</div>}
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Invoice Upload (optional)</label>
                  <input type="file" ref={fileRefInvoice} style={{ display: 'none' }} multiple onChange={(e) => setInvoiceUploads([...invoiceUploads, ...Array.from(e.target.files)])} />
                  <button className="btn-secondary" type="button" onClick={() => fileRefInvoice.current?.click()}>
                    <Icon name="paperclip" size={16} /> Choose Invoice
                  </button>
                  {invoiceUploads.length > 0 && <div className="error-text" style={{ color: 'var(--text-muted)', marginTop: 8 }}>{invoiceUploads.length} file(s) selected</div>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Preferred Contact Method</label>
                  <div className="contact-methods">
                    {['email', 'phone', 'whatsapp'].map(m => (
                      <div key={m} className={`contact-method ${contactMethod === m ? 'selected' : ''}`} onClick={() => setContactMethod(m)}>
                        <Icon name={m === 'email' ? 'mail' : m === 'phone' ? 'phone' : 'message-circle'} size={20} />
                        <span className="contact-method-label">{m[0].toUpperCase() + m.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {ticketType === 'amc_service_request' && (
              <>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Service Type</label>
                  <select className="form-input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                    {['General Maintenance', 'Software Troubleshooting', 'Parts Replacement', 'Cleaning & Inspection'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Preferred Date</label>
                    <input className="form-input" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Preferred Time</label>
                    <input className="form-input" type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Additional Instructions</label>
                  <textarea className="form-input textarea" placeholder="Add any notes for the engineer..." value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} rows={4} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Preferred Contact Method</label>
                  <div className="contact-methods">
                    {['email', 'phone', 'whatsapp'].map(m => (
                      <div key={m} className={`contact-method ${contactMethod === m ? 'selected' : ''}`} onClick={() => setContactMethod(m)}>
                        <Icon name={m === 'email' ? 'mail' : m === 'phone' ? 'phone' : 'message-circle'} size={20} />
                        <span className="contact-method-label">{m[0].toUpperCase() + m.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {ticketType === 'renew_amc' && (
              <>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Current AMC</label>
                  <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                    <div className="raise-ticket-product-info">
                      <h3 style={{ marginBottom: 4 }}>{currentAmc || 'Inactive'}</h3>
                      <p>Renew to continue maintenance benefits.</p>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Available AMC Plans</label>
                  <div className="amc-plans" style={{ marginBottom: 0 }}>
                    {availablePlans.map(p => (
                      <div
                        key={p.id}
                        className={`amc-plan-card ${selectedPlanId === p.id ? 'selected' : ''} ${p.highlighted && selectedPlanId !== p.id ? 'highlighted' : ''}`}
                        onClick={() => {
                          setSelectedPlanId(p.id);
                          setRenewalPrice(p.price);
                        }}
                      >
                        <div className="amc-plan-info">
                          <div className="amc-plan-name">{p.name}</div>
                          <div className="amc-plan-price">{p.price}</div>
                        </div>
                        <div className="amc-plan-radio" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Plan Comparison</label>
                  <div className="form-input" style={{ background: 'var(--bg-primary)', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{planComparison}</span>
                  </div>
                </div>

                <div className="amc-benefits" style={{ marginBottom: 16 }}>
                  <h4>Benefits</h4>
                  {benefits.map((b, i) => (
                    <div key={i} className="amc-benefit-item">
                      <Icon name="check-circle" size={16} color="#22c55e" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Renewal Price</label>
                  <div className="form-input" style={{ background: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Selected Plan</span>
                      <span style={{ fontWeight: 700 }}>{selectedPlan?.name}</span>
                    </div>
                    <div style={{ height: 10 }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Price</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-hover)' }}>{renewalPrice}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Summary</label>
                  <div className="form-input" style={{ background: 'var(--bg-primary)' }}>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                        <span>{renewalPrice}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                        <span>Included</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                        <span>Total</span>
                        <span style={{ color: 'var(--accent-hover)' }}>{renewalPrice}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                <img src={selectedProduct?.image} alt={selectedProduct?.name} />
                <div className="raise-ticket-product-info">
                  <h3 style={{ marginBottom: 4 }}>Selected Product</h3>
                  <p>{selectedProduct?.name} · {selectedProduct?.serial}</p>
                </div>
              </div>

              <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                <div className="raise-ticket-product-info">
                  <h3 style={{ marginBottom: 4 }}>Selected Ticket Type</h3>
                  <p>{REQUEST_TYPES.find(t => t.id === ticketType)?.title || ticketType}</p>
                </div>
              </div>

              {ticketType !== 'renew_amc' && (
                <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                  <div className="raise-ticket-product-info">
                    <h3 style={{ marginBottom: 4 }}>Entered Information</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      {ticketType === 'general_complaint' && `Category: ${issueCategory || '-'}\nPriority: ${priority}\nDescription: ${description || '-'}`}
                      {ticketType === 'warranty_claim' && `Category: ${issueCategory || '-'}\nDescription: ${description || '-'}`}
                      {ticketType === 'amc_service_request' && `Service: ${serviceType}\nPreferred: ${preferredDate || '-'} at ${preferredTime || '-'}\nNotes: ${additionalInstructions || '-'}`}
                    </p>
                  </div>
                </div>
              )}

              {ticketType === 'renew_amc' && (
                <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                  <div className="raise-ticket-product-info">
                    <h3 style={{ marginBottom: 4 }}>Payment Summary</h3>
                    <p>{selectedPlan?.name} · {renewalPrice}</p>
                    <p style={{ marginTop: 6 }}>Benefits: {benefits.join(', ')}</p>
                  </div>
                </div>
              )}

              <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                <div className="raise-ticket-product-info" style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: 4 }}>Uploaded Files</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {ticketType === 'general_complaint' && `Images: ${files.length} · Documents: ${documents.length}`}
                    {ticketType === 'warranty_claim' && `Evidence: ${warrantyEvidence.length} · Invoice: ${invoiceUploads.length}`}
                    {ticketType === 'amc_service_request' && 'No uploads in this flow'}
                    {ticketType === 'renew_amc' && 'No uploads in this flow'}
                  </p>
                </div>
              </div>

              <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                <div className="raise-ticket-product-info" style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: 4 }}>Estimated Response Time</h3>
                  <p>{estimatedResponseTime || '-'}</p>
                </div>
              </div>

              <div className="raise-ticket-product" style={{ padding: 14, marginBottom: 0 }}>
                <div className="raise-ticket-product-info" style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: 4 }}>Support Level</h3>
                  <p>{supportLevel || '-'}</p>
                </div>
              </div>
            </div>

            <div style={{ height: 12 }} />

            <div className="wizard-footer" style={{ marginTop: 24 }}>
              <button className="btn-secondary" onClick={() => setStep(3)}>Previous</button>
              <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={handleSaveDraft}><Icon name="save" size={16} /> Save Draft</button>
                <button className="btn-primary" onClick={handleSubmit}>
                  <Icon name="check-circle" size={16} /> Submit Ticket
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {step !== 4 && (
        <div className="wizard-footer">
          <button className="btn-secondary" onClick={() => (step === 1 ? onBack?.() : setStep(step - 1))}>
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (step === 1) handleStep1Continue();
              else if (step === 2) handleStep2Continue();
              else if (step === 3) setStep(4);
            }}
            disabled={step === 3 && !canGoNextFromStep3()}
          >
            {step === 1 ? <>Continue <Icon name="chevron-right" size={16} /></> : step === 2 ? <>Continue <Icon name="chevron-right" size={16} /></> : <>Continue <Icon name="chevron-right" size={16} /></>}
          </button>
        </div>
      )}
    </div>
  );
}

