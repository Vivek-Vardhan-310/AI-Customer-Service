export const MOCK_PRODUCTS = [
  { id: 'p1', name: 'ThinkPad X1 Carbon', serial: 'PF31ABK2', model: 'TP-2023-X1', image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400', warranty: 'Active', warrantyDays: 210, warrantyTotal: 365, amc: 'Active', amcDays: 54, amcTotal: 365, status: 'Active', purchaseDate: 'Nov 15, 2025' },
  { id: 'p2', name: 'IdeaPad Slim 5', serial: 'MP5L8MH2', model: 'IP-2024-S5', image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', warranty: 'Expiring Soon', warrantyDays: 28, warrantyTotal: 365, amc: 'Inactive', amcDays: 0, amcTotal: 365, status: 'Expiring Soon', purchaseDate: 'Mar 10, 2025' },
  { id: 'p3', name: 'Legion 5 Pro', serial: 'SL80PX120', model: 'LG-2024-5P', image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', warranty: 'Active', warrantyDays: 340, warrantyTotal: 730, amc: 'Active', amcDays: 340, amcTotal: 365, status: 'Active', purchaseDate: 'Jan 5, 2026' },
];

export const MOCK_TICKETS = [
  { id: 'CS-8992', product: 'ThinkPad X1 Carbon', title: 'ThinkPad Keyboard Backlight Issue', category: 'Keyboard', status: 'In Progress', created: '13 Jun 2026', updated: '14 Jun 2026', description: 'Keyboard backlight stopped working after the latest software update.', timeline: [
    { step: 'Complaint Raised', date: '12 Jun 2026 ┬╖ 10:00 AM', done: true },
    { step: 'Assigned to Engineer', date: '12 Jun 2026 ┬╖ 11:15 AM', done: true },
    { step: 'Diagnosis Started', date: '13 Jun 2026 ┬╖ 09:40 AM', done: true },
    { step: 'In Progress', date: '14 Jun 2026 ┬╖ 02:20 PM', done: true },
    { step: 'Resolved', date: '', done: false },
    { step: 'Closed', date: '', done: false },
  ], updates: [
    { date: '14 Jun 2026 ┬╖ 12:03 PM', text: 'Our engineer is currently working on this issue. Driver conflict identified. Fix in progress.', author: 'Rajesh K., Support Engineer' },
    { date: '13 Jun 2026 ┬╖ 09:40 AM', text: 'Issue has been assigned to our technical team for diagnosis.', author: 'System' },
    { date: '12 Jun 2026 ┬╖ 11:15 AM', text: 'Ticket has been assigned to Rajesh K.', author: 'System' },
  ]},
  { id: 'CS-9011', product: 'Legion 5 Pro', title: 'System Overheating During Games', category: 'Hardware', status: 'Open', created: '14 Jun 2026', updated: '14 Jun 2026', description: 'System heats up excessively during gaming sessions, causing throttling.', timeline: [
    { step: 'Complaint Raised', date: '14 Jun 2026 ┬╖ 08:30 AM', done: true },
    { step: 'Assigned to Engineer', date: '', done: false },
    { step: 'Diagnosis Started', date: '', done: false },
    { step: 'In Progress', date: '', done: false },
    { step: 'Resolved', date: '', done: false },
    { step: 'Closed', date: '', done: false },
  ], updates: [] },
  { id: 'CS-8721', product: 'ThinkPad X1 Carbon', title: 'Battery Not Charging After Update', category: 'Battery', status: 'Resolved', created: '01 Jun 2026', updated: '10 Jun 2026', description: 'Battery stopped charging after latest BIOS update. Adapter works fine with other devices.', timeline: [
    { step: 'Complaint Raised', date: '01 Jun 2026', done: true },
    { step: 'Assigned to Engineer', date: '01 Jun 2026', done: true },
    { step: 'Diagnosis Started', date: '02 Jun 2026', done: true },
    { step: 'In Progress', date: '03 Jun 2026', done: true },
    { step: 'Resolved', date: '10 Jun 2026', done: true },
    { step: 'Closed', date: '', done: false },
  ], updates: [] },
  { id: 'CS-7960', product: 'IdeaPad Slim 5', title: 'WiFi Connectivity Issues', category: 'Network', status: 'Closed', created: '30 May 2026', updated: '05 Jun 2026', description: 'WiFi keeps disconnecting intermittently.', timeline: [
    { step: 'Complaint Raised', date: '30 May 2026', done: true },
    { step: 'Assigned to Engineer', date: '30 May 2026', done: true },
    { step: 'Diagnosis Started', date: '31 May 2026', done: true },
    { step: 'In Progress', date: '01 Jun 2026', done: true },
    { step: 'Resolved', date: '04 Jun 2026', done: true },
    { step: 'Closed', date: '05 Jun 2026', done: true },
  ], updates: [] },
];
export const MOCK_PRODUCTS = [
  { id: 'p1', name: 'ThinkPad X1 Carbon', serial: 'PF31ABK2', model: 'TP-2023-X1', image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400', warranty: 'Active', warrantyDays: 210, warrantyTotal: 365, amc: 'Active', amcDays: 54, amcTotal: 365, status: 'Active', purchaseDate: 'Nov 15, 2025' },
  { id: 'p2', name: 'IdeaPad Slim 5', serial: 'MP5L8MH2', model: 'IP-2024-S5', image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', warranty: 'Expiring Soon', warrantyDays: 28, warrantyTotal: 365, amc: 'Inactive', amcDays: 0, amcTotal: 365, status: 'Expiring Soon', purchaseDate: 'Mar 10, 2025' },
  { id: 'p3', name: 'Legion 5 Pro', serial: 'SL80PX120', model: 'LG-2024-5P', image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', warranty: 'Active', warrantyDays: 340, warrantyTotal: 730, amc: 'Active', amcDays: 340, amcTotal: 365, status: 'Active', purchaseDate: 'Jan 5, 2026' },
];

export const MOCK_TICKETS = [
  { id: 'CS-8992', product: 'ThinkPad X1 Carbon', title: 'ThinkPad Keyboard Backlight Issue', category: 'Keyboard', status: 'In Progress', created: '13 Jun 2026', updated: '14 Jun 2026', description: 'Keyboard backlight stopped working after the latest software update.', timeline: [
    { step: 'Complaint Raised', date: '12 Jun 2026 ┬╖ 10:00 AM', done: true },
    { step: 'Assigned to Engineer', date: '12 Jun 2026 ┬╖ 11:15 AM', done: true },
    { step: 'Diagnosis Started', date: '13 Jun 2026 ┬╖ 09:40 AM', done: true },
    { step: 'In Progress', date: '14 Jun 2026 ┬╖ 02:20 PM', done: true },
    { step: 'Resolved', date: '', done: false },
    { step: 'Closed', date: '', done: false },
  ], updates: [
    { date: '14 Jun 2026 ┬╖ 12:03 PM', text: 'Our engineer is currently working on this issue. Driver conflict identified. Fix in progress.', author: 'Rajesh K., Support Engineer' },
    { date: '13 Jun 2026 ┬╖ 09:40 AM', text: 'Issue has been assigned to our technical team for diagnosis.', author: 'System' },
    { date: '12 Jun 2026 ┬╖ 11:15 AM', text: 'Ticket has been assigned to Rajesh K.', author: 'System' },
  ]},
  { id: 'CS-9011', product: 'Legion 5 Pro', title: 'System Overheating During Games', category: 'Hardware', status: 'Open', created: '14 Jun 2026', updated: '14 Jun 2026', description: 'System heats up excessively during gaming sessions, causing throttling.', timeline: [
    { step: 'Complaint Raised', date: '14 Jun 2026 ┬╖ 08:30 AM', done: true },
    { step: 'Assigned to Engineer', date: '', done: false },
    { step: 'Diagnosis Started', date: '', done: false },
    { step: 'In Progress', date: '', done: false },
    { step: 'Resolved', date: '', done: false },
    { step: 'Closed', date: '', done: false },
  ], updates: [] },
  { id: 'CS-8721', product: 'ThinkPad X1 Carbon', title: 'Battery Not Charging After Update', category: 'Battery', status: 'Resolved', created: '01 Jun 2026', updated: '10 Jun 2026', description: 'Battery stopped charging after latest BIOS update. Adapter works fine with other devices.', timeline: [
    { step: 'Complaint Raised', date: '01 Jun 2026', done: true },
    { step: 'Assigned to Engineer', date: '01 Jun 2026', done: true },
    { step: 'Diagnosis Started', date: '02 Jun 2026', done: true },
    { step: 'In Progress', date: '03 Jun 2026', done: true },
    { step: 'Resolved', date: '10 Jun 2026', done: true },
    { step: 'Closed', date: '', done: false },
  ], updates: [] },
  { id: 'CS-7960', product: 'IdeaPad Slim 5', title: 'WiFi Connectivity Issues', category: 'Network', status: 'Closed', created: '30 May 2026', updated: '05 Jun 2026', description: 'WiFi keeps disconnecting intermittently.', timeline: [
    { step: 'Complaint Raised', date: '30 May 2026', done: true },
    { step: 'Assigned to Engineer', date: '30 May 2026', done: true },
    { step: 'Diagnosis Started', date: '31 May 2026', done: true },
    { step: 'In Progress', date: '01 Jun 2026', done: true },
    { step: 'Resolved', date: '04 Jun 2026', done: true },
    { step: 'Closed', date: '05 Jun 2026', done: true },
  ], updates: [] },
];