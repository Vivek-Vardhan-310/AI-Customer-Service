import { supabase } from '../config';

// ── Profile ──────────────────────────────────────────────────

export async function fetchProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) { console.error('fetchProfile error:', error); return null; }
  return data;
}

export async function updateProfile(updates) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) { console.error('updateProfile error:', error); return null; }
  return data;
}

// ── Products ─────────────────────────────────────────────────

export async function fetchProducts() {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('fetchProducts error:', error); return []; }

  // Compute dynamic warranty/AMC fields for the frontend
  const today = new Date();
  return (data || []).map(p => {
    const warrantyEnd = p.warranty_end ? new Date(p.warranty_end) : null;
    const warrantyDays = warrantyEnd ? Math.max(0, Math.ceil((warrantyEnd - today) / (1000 * 60 * 60 * 24))) : 0;
    const warrantyStatus = warrantyDays > 60 ? 'Active' : warrantyDays > 0 ? 'Expiring Soon' : 'Expired';

    const amcEnd = p.amc_end ? new Date(p.amc_end) : null;
    const amcDays = amcEnd ? Math.max(0, Math.ceil((amcEnd - today) / (1000 * 60 * 60 * 24))) : 0;

    return {
      ...p,
      // Map DB fields to the shape the UI components expect
      serial: p.serial_number,
      image: p.image_url,
      purchaseDate: p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
      warranty: warrantyStatus,
      warrantyDays,
      warrantyTotal: p.warranty_total_days || 365,
      amc: p.amc_status || 'Inactive',
      amcDays,
      amcTotal: p.amc_total_days || 365,
      status: warrantyStatus,
    };
  });
}

// ── Tickets ──────────────────────────────────────────────────

export async function fetchTickets() {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      product:products(id, name, serial_number, image_url),
      timeline:ticket_timeline(id, step_name, step_date, is_done, sort_order),
      updates:ticket_updates(id, update_text, author, created_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('fetchTickets error:', error); return []; }

  return (data || []).map(t => {
    const timeline = (t.timeline || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        step: s.step_name,
        date: s.step_date ? new Date(s.step_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        done: s.is_done,
      }));

    const updates = (t.updates || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(u => ({
        date: new Date(u.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        text: u.update_text,
        author: u.author,
      }));

    return {
      ...t,
      product: t.product?.name || 'Unknown Product',
      productImage: t.product?.image_url || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=200',
      productSerial: t.product?.serial_number || 'N/A',
      title: t.title,
      created: new Date(t.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      updated: new Date(t.updated_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeline,
      updates,
    };
  });
}

export async function createTicket({ productId, title, category, description, contactMethod }) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ticketId = `CS-${9100 + Math.floor(Math.random() * 900)}`;

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      id: ticketId,
      user_id: user.id,
      product_id: productId,
      title,
      category,
      status: 'Open',
      description,
      contact_method: contactMethod || 'email',
    })
    .select()
    .single();

  if (error) { console.error('createTicket error:', error); return null; }

  // Create default timeline steps
  const defaultSteps = ['Complaint Raised', 'Assigned to Engineer', 'Diagnosis Started', 'In Progress', 'Resolved', 'Closed'];
  const timelineRows = defaultSteps.map((step, i) => ({
    ticket_id: ticketId,
    step_name: step,
    step_date: i === 0 ? new Date().toISOString() : null,
    is_done: i === 0,
    sort_order: i + 1,
  }));

  await supabase.from('ticket_timeline').insert(timelineRows);

  return data;
}

// ── FAQ ──────────────────────────────────────────────────────

export async function fetchFAQCategories() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('faq_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) { console.error('fetchFAQCategories error:', error); return []; }
  return data || [];
}

export async function fetchFAQArticles(categorySlug) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('faq_articles')
    .select('*')
    .eq('category_slug', categorySlug)
    .order('sort_order', { ascending: true });

  if (error) { console.error('fetchFAQArticles error:', error); return []; }

  // Map to shape the UI expects: { id, q, a }
  return (data || []).map(a => ({
    id: a.id,
    q: a.question,
    a: a.answer,
  }));
}

// ── Issue Categories ─────────────────────────────────────────

export async function fetchIssueCategories() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('issue_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) { console.error('fetchIssueCategories error:', error); return []; }

  // Map to shape UI expects: { id, name, icon }
  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    label: c.name,
  }));
}

// ── Feedback ─────────────────────────────────────────────────

export async function submitFeedback({ rating, comment, ticketId }) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      ticket_id: ticketId || null,
      rating,
      comment: comment || null,
    })
    .select()
    .single();

  if (error) { console.error('submitFeedback error:', error); return null; }
  return data;
}
