-- ============================================================
-- AI Customer Service — Complete Supabase Schema
-- Run this ENTIRE script in the Supabase SQL Editor.
-- It drops existing tables and creates everything fresh.
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Drop existing tables (cascade to remove FK dependencies)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS ticket_updates CASCADE;
DROP TABLE IF EXISTS ticket_timeline CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS faq_articles CASCADE;
DROP TABLE IF EXISTS faq_categories CASCADE;
DROP TABLE IF EXISTS issue_categories CASCADE;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2a. Profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2b. Products (user's registered devices)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  model TEXT,
  image_url TEXT,
  purchase_date DATE,
  warranty_end DATE,
  warranty_total_days INT DEFAULT 365,
  amc_status TEXT DEFAULT 'Inactive' CHECK (amc_status IN ('Active', 'Inactive', 'Expiring Soon')),
  amc_end DATE,
  amc_total_days INT DEFAULT 365,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_user ON products(user_id);

-- 2c. Tickets
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  description TEXT,
  contact_method TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);

-- 2d. Ticket Timeline (individual steps)
CREATE TABLE ticket_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_date TIMESTAMPTZ,
  is_done BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_timeline_ticket ON ticket_timeline(ticket_id);

-- 2e. Ticket Updates (admin messages)
CREATE TABLE ticket_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_updates_ticket ON ticket_updates(ticket_id);

-- 2f. Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id TEXT REFERENCES tickets(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2g. Attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  filename TEXT,
  url TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2h. FAQ Categories (global, not per-user)
CREATE TABLE faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- 2i. FAQ Articles (global)
CREATE TABLE faq_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL REFERENCES faq_categories(slug) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_faq_articles_cat ON faq_articles(category_slug);

-- 2j. Issue Categories (for warranty claims dropdown)
CREATE TABLE issue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0
);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Products: users can CRUD their own products
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- Tickets: users can CRUD their own tickets
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON tickets FOR UPDATE
  USING (auth.uid() = user_id);

-- Ticket Timeline: accessible via ticket ownership
CREATE POLICY "Users can view own ticket timeline"
  ON ticket_timeline FOR SELECT
  USING (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_timeline.ticket_id AND tickets.user_id = auth.uid()));

CREATE POLICY "Users can insert own ticket timeline"
  ON ticket_timeline FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_timeline.ticket_id AND tickets.user_id = auth.uid()));

-- Ticket Updates: accessible via ticket ownership
CREATE POLICY "Users can view own ticket updates"
  ON ticket_updates FOR SELECT
  USING (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_updates.ticket_id AND tickets.user_id = auth.uid()));

-- Feedback: users can insert and view their own
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Attachments: accessible via ticket ownership
CREATE POLICY "Users can view own attachments"
  ON attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = attachments.ticket_id AND tickets.user_id = auth.uid()));

CREATE POLICY "Users can insert own attachments"
  ON attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = attachments.ticket_id AND tickets.user_id = auth.uid()));

-- FAQ & Issue Categories: public read for all authenticated users
CREATE POLICY "Anyone can read FAQ categories"
  ON faq_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read FAQ articles"
  ON faq_articles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read issue categories"
  ON issue_categories FOR SELECT
  USING (true);

-- ============================================================
-- 4. TRIGGER: Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. TRIGGER: Auto-update updated_at on tickets
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. SEED DATA: FAQ Categories
-- ============================================================

INSERT INTO faq_categories (slug, name, icon, sort_order) VALUES
  ('hardware',     'Hardware Problems',           'monitor',     1),
  ('battery',      'Battery & Power',             'battery',     2),
  ('software',     'Software & OS',               'code',        3),
  ('network',      'Network & Connectivity',      'wifi',        4),
  ('warranty',     'Warranty & Services',         'shield',      5),
  ('drivers',      'Drivers & Downloads',         'download',    6),
  ('connectivity', 'Connectivity (Wi-Fi, BT)',    'bluetooth',   7),
  ('accessories',  'Accessories & Peripherals',   'headphones',  8);

-- ============================================================
-- 7. SEED DATA: FAQ Articles
-- ============================================================

INSERT INTO faq_articles (category_slug, question, answer, sort_order) VALUES
-- Battery & Power
('battery', 'Why is my battery draining faster than expected?',
 E'Modern laptops can show faster drain for many reasons. Follow these steps to diagnose and improve battery life:\n\n• Check power profile: Set Windows to Balanced or Power Saver (Settings → System → Power & battery).\n• Identify heavy apps: Open Task Manager → Processes and sort by "Power usage". Close or uninstall apps that consume excessive resources.\n• Screen brightness: Reduce brightness or enable adaptive brightness.\n• Background sync & peripherals: Disable background sync, disconnect unused USB devices, and turn off Bluetooth when not required.\n• Drivers & BIOS: Update display, chipset, and power management drivers from the official support site; update BIOS if available.\n• Battery health: Use manufacturer tools (Lenovo Vantage, ASUS MyASUS) to view charge cycles and health. Consider battery replacement if health is low.\n\nIf the steps above don''t help, collect battery reports (powercfg /batteryreport) and share with support when raising a ticket.', 1),

('battery', 'My laptop does not charge — what should I check?',
 E'Quick checklist to determine why charging fails:\n\n• Power source: Try a different wall socket and remove any power strips.\n• Adapter & cable: Inspect for frayed cables or bent pins; test with a known-good compatible adapter.\n• Charging port: Check for debris in the DC jack; gently clean and reseat the plug.\n• Battery indicator: Does the LED blink or remain off? Note the pattern — useful for diagnostics.\n• Battery status in OS: Check Windows Settings → System → Power & battery or use powercfg /batteryreport to view state.\n• BIOS/firmware: Boot into BIOS and check battery/adapter status; update BIOS if vendor recommends.\n• Diagnostics: Run the vendor hardware diagnostics (Lenovo Diagnostics/UEFI tools).\n\nIf hardware checks fail, avoid repeated attempts to charge — raise a service request with serial number, photos of the adapter/port, and the battery report.', 2),

('battery', 'How can I improve long-term battery life and longevity?',
 E'Best practices to keep your battery healthy over time:\n\n• Avoid constant 100% charging: For daily use, keep the battery between ~20%–80% where possible.\n• Use recommended chargers: Always use the manufacturer-specified adapter.\n• Keep firmware updated: BIOS and power driver updates often include battery-management improvements.\n• Avoid extreme temperatures: Do not operate or store the laptop in very hot (>35°C) or very cold (<0°C) conditions.\n• Storage: If storing long-term, charge to ~50% and power off.\n• Calibration: Occasionally perform a full charge-discharge cycle to help the battery gauge remain accurate.\n\nFor enterprise or heavy users, consider vendor power-management utilities that allow charging thresholds and preservation modes.', 3),

-- Hardware
('hardware', 'Keyboard or certain keys are not responding — what should I do?',
 E'Step-by-step troubleshooting for keyboard issues:\n\n• Reboot & test: Restart the laptop and test the keyboard in BIOS (if supported) or an external USB keyboard.\n• Check for Fn lock / hotkeys: Ensure Fn Lock isn''t enabled; toggle Fn combinations to restore normal behavior.\n• Drivers: Open Device Manager → Keyboards → Update driver. Uninstall and reboot to reinstall if needed.\n• Software conflicts: Boot into Safe Mode; if keyboard works there, a third-party app may be blocking input.\n• Physical damage: Look for liquid spills, crumbs, or stuck keys. Clean carefully or seek service.\n• External keyboard: If an external keyboard works, the issue is likely hardware-related.\n\nIf hardware replacement is required, note your serial number and warranty status before contacting support.', 1),

('hardware', 'My screen is flickering or shows artifacts — how can I fix it?',
 E'Follow these diagnostics to isolate display flicker/artifact problems:\n\n• Isolate app vs system: Does flicker happen only with one app? Update or reinstall that app.\n• Refresh rate & resolution: Right-click Desktop → Display settings → Advanced display → set the recommended resolution and refresh rate.\n• GPU drivers: Update graphics drivers from the vendor (Intel/AMD/NVIDIA) or your laptop support page.\n• Hardware acceleration: Disable hardware acceleration in browsers or specific apps to test.\n• External monitor test: Connect an external display — if external is fine, issue may be laptop panel or cable.\n• BIOS & firmware: Update BIOS and embedded controller (EC) firmware.\n\nIf the screen has persistent artifacts across BIOS and external displays also fail, it may indicate GPU or cable failure — open a support ticket with reproduction steps and sample photos/video.', 2),

('hardware', 'Touchpad stopped working — what can I try?',
 E'Touchpad troubleshooting checklist:\n\n• Toggle touchpad on/off: Look for a touchpad toggle (Fn + function key) or Settings → Bluetooth & devices → Touchpad.\n• Driver updates: Update touchpad drivers (Synaptics/ELAN) from Device Manager or vendor site.\n• External mouse conflict: Unplug external mouse and test.\n• BIOS check: Ensure touchpad is enabled in BIOS settings.\n• Sensitivity settings: Reset touchpad sensitivity to default.\n• Hardware issue: If buttons or gestures fail but physical clicking works, the touch sensor may be faulty.\n\nIf none of the above work, collect system logs and contact support for hardware service.', 3),

-- Software & OS
('software', 'My system is slow — how do I diagnose performance issues?',
 E'A systematic approach to improving system performance:\n\n• Task Manager analysis: Press Ctrl+Shift+Esc → Processes/Performance to find CPU, memory, disk, or GPU bottlenecks.\n• Background apps & startup: Disable unnecessary startup apps (Task Manager → Startup).\n• Disk health & space: Run chkdsk /f and free up disk space. Consider moving large files to external storage or cloud.\n• RAM & storage: Low RAM or a slow HDD can slow systems — consider adding RAM or upgrading to an SSD.\n• Malware scan: Run a full scan with Windows Defender or another reputable anti-malware tool.\n• Software updates: Keep OS and drivers current; sometimes old drivers cause regressions.\n• Reset browser: If browsing is slow, clear cache or reset the browser.\n\nIf performance is inconsistent, create a timeline of when slowness occurs and which apps are active, then escalate to support with logs.', 1),

('software', 'I see a Blue Screen (BSOD) — what information should I collect?',
 E'Blue Screens can be caused by hardware or drivers. Gather these details before contacting support:\n\n• Error code & message: Copy the STOP code (e.g., IRQL_NOT_LESS_OR_EQUAL) and any driver file mentioned.\n• Minidump files: Enable Minidump in System Properties → Advanced → Startup and Recovery and attach the files from C:\\Windows\\Minidump.\n• Recent changes: Note any recent driver installations, Windows updates, or hardware changes.\n• Reproduce steps: If the BSOD occurs during a specific action, document the steps to reproduce.\n\nBasic troubleshooting: update drivers, run memory diagnostics (mdsched.exe), and check disk health. If unstable, collect logs and open a support ticket.', 2),

-- Network
('network', 'Wi‑Fi keeps disconnecting — how can I stabilize the connection?',
 E'Troubleshoot intermittent Wi‑Fi disconnects with these steps:\n\n• Router & ISP: Restart your router and modem; verify if other devices have the same issue.\n• Signal & placement: Move closer to the router, avoid obstructions and sources of interference (microwaves, cordless phones).\n• Band selection: Try switching between 2.4GHz and 5GHz networks; 5GHz is faster but has shorter range.\n• Power settings: In Device Manager → Network adapters → Properties → Power Management, uncheck "Allow the computer to turn off this device".\n• Drivers & firmware: Update Wi‑Fi adapter drivers and router firmware.\n• IP & DNS: Run ipconfig /release && ipconfig /renew && ipconfig /flushdns to reset network stack.\n• Advanced: Set a static channel on the router to avoid automatic channel switching that causes brief drops.\n\nIf connectivity issues persist, capture wireless logs and open a support ticket with SSID, adapter model, and approximate time(s) of disconnects.', 1),

('network', E'Bluetooth paired but device won''t connect or dropouts occur',
 E'Bluetooth troubleshooting steps:\n\n• Remove & re-pair: Remove the device from Bluetooth settings and pair again.\n• Close interfering apps: Some apps may hold audio devices; close any app using audio.\n• Drivers: Update Bluetooth and audio drivers.\n• Power management: Disable Bluetooth power saving in Device Manager.\n• Firmware: Update headphones/headset firmware (if applicable).\n\nFor persistent issues, test the Bluetooth device with another phone/computer to rule out the accessory.', 2),

-- Warranty & Services
('warranty', 'How do I check my warranty status?',
 E'To check warranty status:\n\n• Registered account: Sign in to your manufacturer account (e.g., Lenovo ID) and view registered devices.\n• Serial lookup: Use the service portal and enter your device serial number or SNID.\n• Purchase proof: Keep invoices or order numbers ready — these accelerate claims.\n\nIf your device is not registered, register it with the serial number to get faster service and AMC reminders.', 1),

('warranty', 'What does warranty cover vs AMC (Annual Maintenance Contract)?',
 E'Typical coverage differences (may vary by vendor):\n\n• Manufacturer warranty: Covers manufacturing defects and hardware failures under normal use for the warranty period. Does not cover accidental damage or unauthorized modifications.\n• AMC / Extended warranty: Paid plans that extend coverage, may include on-site service, and sometimes accidental damage protection (check plan details).\n\nAlways read the plan terms — what is excluded and the response time SLA.', 2),

('warranty', 'How do I raise a warranty claim?',
 E'Raising a warranty claim — recommended steps:\n\n• Collect info: Device serial number, proof of purchase, description of the issue, photos/videos, and any error messages.\n• Contact support: Use the support portal or phone number on the website to create a ticket.\n• Diagnostics: Follow remote troubleshooting steps provided by support; be ready to run logs or diagnostic tools.\n• Service appointment: If hardware service is required, schedule an on-site visit or drop-off as instructed.\n\nKeep your ticket ID and follow up if updated timelines are needed.', 3),

-- Drivers & Downloads
('drivers', 'Where can I safely download drivers for my laptop?',
 E'Best practices for driver downloads:\n\n• Official support site: Always use the laptop manufacturer''s support page and enter your serial/model to get tested drivers.\n• Vendor GPU drivers: For GPUs, use Intel/AMD/NVIDIA official drivers if recommended by the vendor page.\n• Avoid third-party driver sites: Untrusted sources may contain incorrect or malicious drivers.\n\nIf you are unsure which driver to install, prefer vendor-provided utility programs (Lenovo Vantage) that recommend and apply the correct driver set.', 1),

('drivers', 'I updated a driver and now the system is unstable — how do I revert?',
 E'How to roll back a problematic driver:\n\n• Device Manager rollback: Right-click the device → Properties → Driver → Roll Back Driver (if available).\n• Uninstall & reinstall: Use Device Manager to uninstall the device (check "Delete driver software"), then reboot and let Windows reinstall a stable driver.\n• System restore: If you have a System Restore point, revert to a previous state.\n• Safe Mode: Boot to Safe Mode to perform removals if normal mode is unstable.\n\nIf stability issues persist, capture event logs and contact support for a guided rollback.', 2),

-- Accessories & Peripherals
('accessories', 'My charger or adapter is not powering the laptop reliably — what should I check?',
 E'Charger troubleshooting checklist:\n\n• Check rating: Ensure the replacement adapter matches required voltage and wattage. Undersized adapters may not charge under load.\n• Cable & connector: Inspect for damage and test with another compatible adapter.\n• Intermittent charging: Wiggle the connector gently — if charging cuts in/out, port repair may be required.\n• Battery vs adapter: Remove battery (if removable) and test adapter-only boot (where supported) to isolate the issue.\n\nIf the adapter is faulty or pins are damaged, replace with an official or certified adapter.', 1),

('accessories', 'External monitor not detected — how can I fix this?',
 E'Steps to diagnose external display issues:\n\n• Cable & port: Try a different cable and port (HDMI/DP/USB-C). Test the monitor with another device to rule out the monitor.\n• Input source: Ensure the external monitor input is set to the correct source.\n• Display settings: Windows → Display settings → Detect; set "Multiple displays" to Extend or Duplicate as needed.\n• GPU drivers: Update graphics drivers and check display adapter settings.\n• Adapter dongles: If using a passive adapter, test with an active adapter if the laptop requires DisplayPort alt-mode.\n\nIf multiple monitors fail across ports, collect logs and contact support — include GPU model and adapter type.', 2);

-- ============================================================
-- 8. SEED DATA: Issue Categories (for warranty claim form)
-- ============================================================

INSERT INTO issue_categories (name, icon, sort_order) VALUES
  ('Display Problems',                'monitor',      1),
  ('Battery & Charging',              'battery',      2),
  ('Performance & Speed',             'activity',     3),
  ('Connectivity (Wi-Fi, Bluetooth)', 'wifi',         4),
  ('Software & OS',                   'code',         5),
  ('Other',                           'help-circle',  6);

-- ============================================================
-- 9. FUNCTION: Seed demo data for a new user (call manually or via trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_demo_data_for_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  p1_id UUID;
  p2_id UUID;
  p3_id UUID;
BEGIN
  -- Insert demo products
  INSERT INTO products (id, user_id, name, serial_number, model, image_url, purchase_date, warranty_end, warranty_total_days, amc_status, amc_end, amc_total_days)
  VALUES
    (gen_random_uuid(), target_user_id, 'ThinkPad X1 Carbon', 'PF31ABK2', 'TP-2023-X1', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400', '2025-11-15', (CURRENT_DATE + INTERVAL '210 days')::date, 365, 'Active', (CURRENT_DATE + INTERVAL '54 days')::date, 365)
  RETURNING id INTO p1_id;

  INSERT INTO products (id, user_id, name, serial_number, model, image_url, purchase_date, warranty_end, warranty_total_days, amc_status, amc_end, amc_total_days)
  VALUES
    (gen_random_uuid(), target_user_id, 'IdeaPad Slim 5', 'MP5L8MH2', 'IP-2024-S5', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', '2025-03-10', (CURRENT_DATE + INTERVAL '28 days')::date, 365, 'Inactive', NULL, 365)
  RETURNING id INTO p2_id;

  INSERT INTO products (id, user_id, name, serial_number, model, image_url, purchase_date, warranty_end, warranty_total_days, amc_status, amc_end, amc_total_days)
  VALUES
    (gen_random_uuid(), target_user_id, 'Legion 5 Pro', 'SL80PX120', 'LG-2024-5P', 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400', '2026-01-05', (CURRENT_DATE + INTERVAL '340 days')::date, 730, 'Active', (CURRENT_DATE + INTERVAL '340 days')::date, 365)
  RETURNING id INTO p3_id;

  -- Insert demo tickets
  INSERT INTO tickets (id, user_id, product_id, title, category, status, description, contact_method, created_at, updated_at)
  VALUES
    ('CS-8992', target_user_id, p1_id, 'ThinkPad Keyboard Backlight Issue', 'Keyboard', 'In Progress', 'Keyboard backlight stopped working after the latest software update.', 'email', '2026-06-13T10:00:00Z', '2026-06-14T14:20:00Z'),
    ('CS-9011', target_user_id, p3_id, 'System Overheating During Games', 'Hardware', 'Open', 'System heats up excessively during gaming sessions, causing throttling.', 'email', '2026-06-14T08:30:00Z', '2026-06-14T08:30:00Z'),
    ('CS-8721', target_user_id, p1_id, 'Battery Not Charging After Update', 'Battery', 'Resolved', 'Battery stopped charging after latest BIOS update. Adapter works fine with other devices.', 'phone', '2026-06-01T00:00:00Z', '2026-06-10T00:00:00Z'),
    ('CS-7960', target_user_id, p2_id, 'WiFi Connectivity Issues', 'Network', 'Closed', 'WiFi keeps disconnecting intermittently.', 'email', '2026-05-30T00:00:00Z', '2026-06-05T00:00:00Z');

  -- Ticket timeline for CS-8992
  INSERT INTO ticket_timeline (ticket_id, step_name, step_date, is_done, sort_order) VALUES
    ('CS-8992', 'Complaint Raised',      '2026-06-12T10:00:00Z', true,  1),
    ('CS-8992', 'Assigned to Engineer',   '2026-06-12T11:15:00Z', true,  2),
    ('CS-8992', 'Diagnosis Started',      '2026-06-13T09:40:00Z', true,  3),
    ('CS-8992', 'In Progress',            '2026-06-14T14:20:00Z', true,  4),
    ('CS-8992', 'Resolved',               NULL,                   false, 5),
    ('CS-8992', 'Closed',                 NULL,                   false, 6);

  -- Ticket updates for CS-8992
  INSERT INTO ticket_updates (ticket_id, update_text, author, created_at) VALUES
    ('CS-8992', 'Our engineer is currently working on this issue. Driver conflict identified. Fix in progress.', 'Rajesh K., Support Engineer', '2026-06-14T12:03:00Z'),
    ('CS-8992', 'Issue has been assigned to our technical team for diagnosis.', 'System', '2026-06-13T09:40:00Z'),
    ('CS-8992', 'Ticket has been assigned to Rajesh K.', 'System', '2026-06-12T11:15:00Z');

  -- Ticket timeline for CS-9011
  INSERT INTO ticket_timeline (ticket_id, step_name, step_date, is_done, sort_order) VALUES
    ('CS-9011', 'Complaint Raised',      '2026-06-14T08:30:00Z', true,  1),
    ('CS-9011', 'Assigned to Engineer',   NULL,                   false, 2),
    ('CS-9011', 'Diagnosis Started',      NULL,                   false, 3),
    ('CS-9011', 'In Progress',            NULL,                   false, 4),
    ('CS-9011', 'Resolved',               NULL,                   false, 5),
    ('CS-9011', 'Closed',                 NULL,                   false, 6);

  -- Ticket timeline for CS-8721
  INSERT INTO ticket_timeline (ticket_id, step_name, step_date, is_done, sort_order) VALUES
    ('CS-8721', 'Complaint Raised',      '2026-06-01T00:00:00Z', true,  1),
    ('CS-8721', 'Assigned to Engineer',   '2026-06-01T00:00:00Z', true,  2),
    ('CS-8721', 'Diagnosis Started',      '2026-06-02T00:00:00Z', true,  3),
    ('CS-8721', 'In Progress',            '2026-06-03T00:00:00Z', true,  4),
    ('CS-8721', 'Resolved',               '2026-06-10T00:00:00Z', true,  5),
    ('CS-8721', 'Closed',                 NULL,                   false, 6);

  -- Ticket timeline for CS-7960
  INSERT INTO ticket_timeline (ticket_id, step_name, step_date, is_done, sort_order) VALUES
    ('CS-7960', 'Complaint Raised',      '2026-05-30T00:00:00Z', true,  1),
    ('CS-7960', 'Assigned to Engineer',   '2026-05-30T00:00:00Z', true,  2),
    ('CS-7960', 'Diagnosis Started',      '2026-05-31T00:00:00Z', true,  3),
    ('CS-7960', 'In Progress',            '2026-06-01T00:00:00Z', true,  4),
    ('CS-7960', 'Resolved',               '2026-06-04T00:00:00Z', true,  5),
    ('CS-7960', 'Closed',                 '2026-06-05T00:00:00Z', true,  6);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE! After running this script:
-- 1. Sign up a user via the app
-- 2. Run: SELECT seed_demo_data_for_user('YOUR_USER_UUID_HERE');
--    to populate demo products & tickets for that user.
--    Find the user UUID in Supabase Dashboard → Authentication → Users
-- ============================================================
