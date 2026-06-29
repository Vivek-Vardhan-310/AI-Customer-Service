import Icon from '../components/ui/Icon';

export default function HomePage({ onNavigate, profile }) {
  const userName = profile?.full_name || 'there';

  return (
    <div>
      <div className="home-hero">
        <video className="home-bg-video" autoPlay muted loop playsInline poster="/images/lang.svg" aria-hidden="true">
          <source src="/videos/home-bg.mp4" type="video/mp4" />
        </video>
        <div className="home-hero-overlay" aria-hidden="true"></div>
        <div className="home-hero-content">
          <div className="home-greeting">
            <h1>Hi, {userName}</h1>
            <p>How can we help you today?</p>
          </div>
          <h2 className="home-section-title">Popular Actions</h2>
          <div className="home-actions-grid">
            {[
              {
                icon: 'shield',
                title: 'Check Warranty',
                desc: 'Check your warranty status',
                tab: 'products'
              },
              {
                icon: 'ticket',
                title: 'Track Complaint',
                desc: 'Track your existing ticket',
                tab: 'tickets'
              },
              {
                icon: 'plus-circle',
                title: 'Create Ticket',
                desc: 'Raise a new support request',
                tab: 'create-ticket'
              },
              {
                icon: 'phone',
                title: 'AI Call Support',
                desc: '24/7 Telephony customer support',
                tab: 'telephony'
              }
            ].map((action, i) => (
              <div
                key={i}
                className={`home-action-card animate-in stagger-${i + 1}`}
                onClick={() => action.tab && onNavigate(action.tab)}
              >
                <div className="home-action-icon">
                  <Icon name={action.icon} size={24} />
                </div>

                <div className="home-action-title">
                  {action.title}
                </div>

                <div className="home-action-desc">
                  {action.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
