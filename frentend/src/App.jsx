import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import './animations.css';

// Config
import { supabase } from './config';

// Supabase data layer
import { fetchProfile, fetchProducts as fetchProductsDB, fetchTickets as fetchTicketsDB } from './lib/supabase';

// Layout & Common Components
import Toast from './components/Toast';
import TopAppBar from './components/TopAppBar';
import FloatingDock from './components/FloatingDock';
import SupportFAB from './components/SupportFAB';
import SupportHubModal from './components/SupportHubModal';
import HamburgerDrawer from './components/HamburgerDrawer';
import InfoModal from './components/ui/InfoModal';

// Pages & Screen Components
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import MyProductsPage from './pages/MyProductsPage';
import ProductDetailView from './pages/ProductDetailView';
import WarrantyClaimWizard from './pages/WarrantyClaimWizard';
import RenewAMCWizard from './pages/RenewAMCWizard';
import TicketsPage from './pages/TicketsPage';
import TicketDetailView from './pages/TicketDetailView';
import FAQsPage from './pages/FAQsPage';
import FAQCategoryView from './pages/FAQCategoryView';
import ChatSupportScreen from './pages/ChatSupportScreen';
import VoiceSupportScreen from './pages/VoiceSupportScreen';
import PostSupportHub from './pages/PostSupportHub';
import FeedbackPopup from './pages/FeedbackPopup';
import SettingsProfilePage from './pages/SettingsProfilePage';

function App() {
  // Auth state
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [loading, setLoading] = useState(false);

  // User data from Supabase
  const [userProfile, setUserProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState('home');
  const [currentView, setCurrentView] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedFAQCategory, setSelectedFAQCategory] = useState(null);

  // Overlays
  const [showSupportHub, setShowSupportHub] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showPostSupport, setShowPostSupport] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTelecomModal, setShowTelecomModal] = useState(false);
  const [showTOSModal, setShowTOSModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ visible: true, message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4200);
  }, []);

  useEffect(() => () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); }, []);

  // Load user data after login
  const loadUserData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [profile, prods, tix] = await Promise.all([
        fetchProfile(),
        fetchProductsDB(),
        fetchTicketsDB(),
      ]);
      setUserProfile(profile);
      setProducts(prods);
      setTickets(tix);
    } catch (e) {
      console.error('Error loading user data:', e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    const prods = await fetchProductsDB();
    setProducts(prods);
  }, []);

  const refreshTickets = useCallback(async () => {
    const tix = await fetchTicketsDB();
    setTickets(tix);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchProfile();
    setUserProfile(profile);
  }, []);

  // Tab change resets view
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentView(null);
    setSelectedProduct(null);
    setSelectedTicket(null);
    setSelectedFAQCategory(null);
  };

  // Supabase session check
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          localStorage.setItem('supabase_token', data.session.access_token);
          setLoggedIn(true);
        }
      } catch (e) { console.error('Session check error:', e); }
    })();
  }, []);

  // Load data when logged in changes to true
  useEffect(() => {
    if (loggedIn) {
      loadUserData();
    }
  }, [loggedIn, loadUserData]);

  const handleLogin = async ({ email, password }) => {
    if (!supabase) { showToast('Supabase not configured — demo mode active', 'warning'); setLoggedIn(true); return true; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { showToast(error.message || 'Login failed', 'error'); return false; }
      if (data?.session?.access_token) { localStorage.setItem('supabase_token', data.session.access_token); setLoggedIn(true); showToast('Welcome back!', 'success'); return true; }
      showToast('No session received', 'error'); return false;
    } catch { showToast('An error occurred', 'error'); return false; }
    finally { setLoading(false); }
  };

  const handleSignup = async ({ email, password }) => {
    if (!supabase) { showToast('Supabase not configured', 'warning'); return false; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { showToast(error.message || 'Signup failed', 'error'); return false; }
      if (data?.user) { showToast('Account created!', 'success'); return true; }
      return false;
    } catch { showToast('An error occurred', 'error'); return false; }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try { if (supabase) await supabase.auth.signOut(); } catch (e) { console.error(e); }
    localStorage.removeItem('supabase_token');
    setLoggedIn(false);
    setCurrentPage('login');
    setActiveTab('home');
    setCurrentView(null);
    setUserProfile(null);
    setProducts([]);
    setTickets([]);
  };

  const openProfilePage = () => {
    setShowProfilePage(true);
    setActiveTab('home');
    setCurrentView(null);
  };

  const handleEndSession = () => {
    setShowChat(false);
    setShowVoice(false);
    setShowPostSupport(true);
  };

  // Not logged in
  if (!loggedIn) {
    return (
      <>
        {currentPage === 'login'
          ? <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setCurrentPage('signup')} loading={loading} showToast={showToast} />
          : <SignupPage onSignup={handleSignup} onSwitchToLogin={() => setCurrentPage('login')} loading={loading} showToast={showToast} />
        }
        <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      </>
    );
  }

  // Render current view content
  const renderContent = () => {
    if (showProfilePage) return <SettingsProfilePage onClose={() => setShowProfilePage(false)} profile={userProfile} refreshProfile={refreshProfile} showToast={showToast} />;
    if (activeTab === 'home' && !currentView) {
      return <HomePage onNavigate={handleTabChange} profile={userProfile} />;
    }
    if (activeTab === 'products') {
      if (currentView === 'warranty-claim' && selectedProduct) {
        return <WarrantyClaimWizard product={selectedProduct} onBack={() => setCurrentView('detail')} onComplete={(id) => { setCurrentView(null); setActiveTab('tickets'); refreshTickets(); showToast('Ticket ' + id + ' created!', 'success'); }} showToast={showToast} />;
      }
      if (currentView === 'renew-amc' && selectedProduct) {
        return <RenewAMCWizard product={selectedProduct} onBack={() => setCurrentView('detail')} showToast={showToast} />;
      }
      if (currentView === 'detail' && selectedProduct) {
        return <ProductDetailView product={selectedProduct} onBack={() => { setCurrentView(null); setSelectedProduct(null); }} onWarrantyClaim={() => setCurrentView('warranty-claim')} onRenewAMC={() => setCurrentView('renew-amc')} />;
      }
      return <MyProductsPage products={products} loading={dataLoading} onSelectProduct={(p) => { setSelectedProduct(p); setCurrentView('detail'); }} />;
    }
    if (activeTab === 'tickets') {
      if (currentView === 'detail' && selectedTicket) {
        return <TicketDetailView ticket={selectedTicket} onBack={() => { setCurrentView(null); setSelectedTicket(null); }} onChat={() => setShowChat(true)} showToast={showToast} />;
      }
      return <TicketsPage tickets={tickets} loading={dataLoading} onSelectTicket={(t) => { setSelectedTicket(t); setCurrentView('detail'); }} />;
    }
    if (activeTab === 'faqs') {
      if (currentView === 'category' && selectedFAQCategory) {
        return <FAQCategoryView category={selectedFAQCategory} onBack={() => { setCurrentView(null); setSelectedFAQCategory(null); }} onChat={() => setShowChat(true)} showToast={showToast} />;
      }
      return <FAQsPage onSelectCategory={(cat) => { setSelectedFAQCategory(cat); setCurrentView('category'); }} onChat={() => setShowChat(true)} showToast={showToast} />;
    }
    return null;
  };

  const pageKey = `${activeTab}-${currentView || 'root'}-${selectedProduct?.id || selectedTicket?.id || selectedFAQCategory?.slug || ''}`;

  return (
    <div className="app-layout">
      <TopAppBar profile={userProfile} onMenuClick={() => setShowDrawer(true)} onLogout={handleLogout} onOpenProfile={openProfilePage} />
      <main className="main-content">
        <div key={pageKey} className="page-wrap fade-up">
          {renderContent()}
        </div>
      </main>
      <FloatingDock activeTab={activeTab} onTabChange={handleTabChange} />
      <SupportFAB onClick={() => setShowSupportHub(true)} />

      {/* Modals & Overlays */}
      {showSupportHub && <SupportHubModal onClose={() => setShowSupportHub(false)} onChat={() => { setShowSupportHub(false); setShowChat(true); }} onVoice={() => { setShowSupportHub(false); setShowVoice(true); }} />}
      {showChat && <ChatSupportScreen onClose={() => setShowChat(false)} onEndSession={handleEndSession} />}
      {showVoice && <VoiceSupportScreen onClose={() => setShowVoice(false)} onEndSession={handleEndSession} />}
      {showPostSupport && <PostSupportHub onClose={() => { setShowPostSupport(false); setActiveTab('home'); setCurrentView(null); }} onRaiseComplaint={() => { setShowPostSupport(false); setActiveTab('tickets'); }} onFeedback={() => { setShowPostSupport(false); setShowFeedback(true); }} onRegisterProduct={() => { setShowPostSupport(false); setActiveTab('products'); }} />}
      {showFeedback && <FeedbackPopup onClose={() => setShowFeedback(false)} showToast={showToast} />}
      {showDrawer && <HamburgerDrawer
        onClose={() => setShowDrawer(false)}
        onOpenLanguage={() => { setShowDrawer(false); setShowLanguageModal(true); }}
        onOpenAboutAI={() => { setShowDrawer(false); setShowAboutModal(true); }}
        onOpenTelecom={() => { setShowDrawer(false); setShowTelecomModal(true); }}
        onOpenTOS={() => { setShowDrawer(false); setShowTOSModal(true); }}
        onOpenPrivacy={() => { setShowDrawer(false); setShowPrivacyModal(true); }}
      />}
      {showLanguageModal && (
        <InfoModal title="Language / हिंदी" imageSrc="/images/lang.svg" onClose={() => setShowLanguageModal(false)}>
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <button className="btn-primary" onClick={() => { setShowLanguageModal(false); showToast?.('Language set to English', 'success'); }}>English</button>
            <button className="btn-secondary" onClick={() => { setShowLanguageModal(false); showToast?.('Language set to Hindi', 'success'); }}>हिंदी</button>
          </div>
        </InfoModal>
      )}
      {showAboutModal && (
        <InfoModal title="About Our AI" imageSrc="/images/ai.svg" onClose={() => setShowAboutModal(false)}>
          <p style={{ color: 'var(--text-secondary)' }}>Our AI assistant provides guided troubleshooting, ticket routing, and contextual help using secure, vendor-approved models. It can suggest diagnostics, collect logs, and help escalate to human engineers when needed.</p>
        </InfoModal>
      )}
      {showTelecomModal && (
        <InfoModal title="Telecom Solutions (B2B)" imageSrc="/images/telecom.svg" onClose={() => setShowTelecomModal(false)}>
          <ul style={{ marginTop: 8 }}>
            <li>Enterprise device management</li>
            <li>Bulk warranty & AMC plans</li>
            <li>Priority SLAs and on-site support</li>
          </ul>
        </InfoModal>
      )}
      {showTOSModal && (
        <InfoModal title="Terms of Service" imageSrc="/images/terms.svg" onClose={() => setShowTOSModal(false)}>
          <p style={{ color: 'var(--text-secondary)' }}>These terms govern the use of LaptopCare services. For full details, please review the complete Terms of Service on our website.</p>
        </InfoModal>
      )}
      {showPrivacyModal && (
        <InfoModal title="Privacy Policy" imageSrc="/images/privacy.svg" onClose={() => setShowPrivacyModal(false)}>
          <p style={{ color: 'var(--text-secondary)' }}>We protect your personal data and process it according to applicable laws. Contact support for data export or deletion requests.</p>
        </InfoModal>
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}

export default App;
