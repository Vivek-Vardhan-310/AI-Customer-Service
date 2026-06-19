export const FAQ_CATEGORIES = [
  { slug: 'hardware', name: 'Hardware Problems', icon: 'monitor' },
  { slug: 'battery', name: 'Battery & Power', icon: 'battery' },
  { slug: 'software', name: 'Software & OS', icon: 'code' },
  { slug: 'network', name: 'Network & Connectivity', icon: 'wifi' },
  { slug: 'warranty', name: 'Warranty & Services', icon: 'shield' },
  { slug: 'drivers', name: 'Drivers & Downloads', icon: 'download' },
  { slug: 'connectivity', name: 'Connectivity (Wi-Fi, BT)', icon: 'bluetooth' },
  { slug: 'accessories', name: 'Accessories & Peripherals', icon: 'headphones' },
];

export const FAQ_ARTICLES = {
  battery: [
    {
      id: 'faq1',
      q: 'Why is my battery draining faster than expected?',
      a: `Modern laptops can show faster drain for many reasons. Follow these steps to diagnose and improve battery life:\n\nΓÇó Check power profile: Set Windows to Balanced or Power Saver (Settings ΓåÆ System ΓåÆ Power & battery).\nΓÇó Identify heavy apps: Open Task Manager ΓåÆ Processes and sort by "Power usage". Close or uninstall apps that consume excessive resources.\nΓÇó Screen brightness: Reduce brightness or enable adaptive brightness.\nΓÇó Background sync & peripherals: Disable background sync, disconnect unused USB devices, and turn off Bluetooth when not required.\nΓÇó Drivers & BIOS: Update display, chipset, and power management drivers from the official support site; update BIOS if available.\nΓÇó Battery health: Use manufacturer tools (Lenovo Vantage, ASUS MyASUS) to view charge cycles and health. Consider battery replacement if health is low.\n\nIf the steps above don't help, collect battery reports (powercfg /batteryreport) and share with support when raising a ticket.`
    },
    {
      id: 'faq2',
      q: 'My laptop does not charge ΓÇö what should I check?',
      a: `Quick checklist to determine why charging fails:\n\nΓÇó Power source: Try a different wall socket and remove any power strips.\nΓÇó Adapter & cable: Inspect for frayed cables or bent pins; test with a known-good compatible adapter.\nΓÇó Charging port: Check for debris in the DC jack; gently clean and reseat the plug.\nΓÇó Battery indicator: Does the LED blink or remain off? Note the pattern ΓÇö useful for diagnostics.\nΓÇó Battery status in OS: Check Windows Settings ΓåÆ System ΓåÆ Power & battery or use powercfg /batteryreport to view state.\nΓÇó BIOS/firmware: Boot into BIOS and check battery/adapter status; update BIOS if vendor recommends.\nΓÇó Diagnostics: Run the vendor hardware diagnostics (Lenovo Diagnostics/UEFI tools).\n\nIf hardware checks fail, avoid repeated attempts to charge ΓÇö raise a service request with serial number, photos of the adapter/port, and the battery report.`
    },
    {
      id: 'faq3',
      q: 'How can I improve long-term battery life and longevity?',
      a: `Best practices to keep your battery healthy over time:\n\nΓÇó Avoid constant 100% charging: For daily use, keep the battery between ~20%ΓÇô80% where possible.\nΓÇó Use recommended chargers: Always use the manufacturer-specified adapter.\nΓÇó Keep firmware updated: BIOS and power driver updates often include battery-management improvements.\nΓÇó Avoid extreme temperatures: Do not operate or store the laptop in very hot (>35┬░C) or very cold (<0┬░C) conditions.\nΓÇó Storage: If storing long-term, charge to ~50% and power off.\nΓÇó Calibration: Occasionally perform a full charge-discharge cycle to help the battery gauge remain accurate.\n\nFor enterprise or heavy users, consider vendor power-management utilities that allow charging thresholds and preservation modes.`
    },
  ],

  hardware: [
    {
      id: 'faq6',
      q: 'Keyboard or certain keys are not responding ΓÇö what should I do?',
      a: `Step-by-step troubleshooting for keyboard issues:\n\nΓÇó Reboot & test: Restart the laptop and test the keyboard in BIOS (if supported) or an external USB keyboard.\nΓÇó Check for Fn lock / hotkeys: Ensure Fn Lock isn't enabled; toggle Fn combinations to restore normal behavior.\nΓÇó Drivers: Open Device Manager ΓåÆ Keyboards ΓåÆ Update driver. Uninstall and reboot to reinstall if needed.\nΓÇó Software conflicts: Boot into Safe Mode; if keyboard works there, a third-party app may be blocking input.\nΓÇó Physical damage: Look for liquid spills, crumbs, or stuck keys. Clean carefully or seek service.\nΓÇó External keyboard: If an external keyboard works, the issue is likely hardware-related.\n\nIf hardware replacement is required, note your serial number and warranty status before contacting support.`
    },
    {
      id: 'faq7',
      q: 'My screen is flickering or shows artifacts ΓÇö how can I fix it?',
      a: `Follow these diagnostics to isolate display flicker/artifact problems:\n\nΓÇó Isolate app vs system: Does flicker happen only with one app? Update or reinstall that app.\nΓÇó Refresh rate & resolution: Right-click Desktop ΓåÆ Display settings ΓåÆ Advanced display ΓåÆ set the recommended resolution and refresh rate.\nΓÇó GPU drivers: Update graphics drivers from the vendor (Intel/AMD/NVIDIA) or your laptop support page.\nΓÇó Hardware acceleration: Disable hardware acceleration in browsers or specific apps to test.\nΓÇó External monitor test: Connect an external display ΓÇö if external is fine, issue may be laptop panel or cable.\nΓÇó BIOS & firmware: Update BIOS and embedded controller (EC) firmware.\n\nIf the screen has persistent artifacts across BIOS and external displays also fail, it may indicate GPU or cable failure ΓÇö open a support ticket with reproduction steps and sample photos/video.`
    },
    {
      id: 'faq8',
      q: 'Touchpad stopped working ΓÇö what can I try?',
      a: `Touchpad troubleshooting checklist:\n\nΓÇó Toggle touchpad on/off: Look for a touchpad toggle (Fn + function key) or Settings ΓåÆ Bluetooth & devices ΓåÆ Touchpad.\nΓÇó Driver updates: Update touchpad drivers (Synaptics/ELAN) from Device Manager or vendor site.\nΓÇó External mouse conflict: Unplug external mouse and test.\nΓÇó BIOS check: Ensure touchpad is enabled in BIOS settings.\nΓÇó Sensitivity settings: Reset touchpad sensitivity to default.\nΓÇó Hardware issue: If buttons or gestures fail but physical clicking works, the touch sensor may be faulty.\n\nIf none of the above work, collect system logs and contact support for hardware service.`
    },
  ],

  software: [
    {
      id: 'faq9',
      q: 'My system is slow ΓÇö how do I diagnose performance issues?',
          a: `A systematic approach to improving system performance:\n\nΓÇó Task Manager analysis: Press Ctrl+Shift+Esc ΓåÆ Processes/Performance to find CPU, memory, disk, or GPU bottlenecks.\nΓÇó Background apps & startup: Disable unnecessary startup apps (Task Manager ΓåÆ Startup).\nΓÇó Disk health & space: Run chkdsk /f and free up disk space. Consider moving large files to external storage or cloud.\nΓÇó RAM & storage: Low RAM or a slow HDD can slow systems ΓÇö consider adding RAM or upgrading to an SSD.\nΓÇó Malware scan: Run a full scan with Windows Defender or another reputable anti-malware tool.\nΓÇó Software updates: Keep OS and drivers current; sometimes old drivers cause regressions.\nΓÇó Reset browser: If browsing is slow, clear cache or reset the browser.\n\nIf performance is inconsistent, create a timeline of when slowness occurs and which apps are active, then escalate to support with logs.`
    },
    {
      id: 'faq10',
      q: 'I see a Blue Screen (BSOD) ΓÇö what information should I collect?',
          a: `Blue Screens can be caused by hardware or drivers. Gather these details before contacting support:\n\nΓÇó Error code & message: Copy the STOP code (e.g., IRQL_NOT_LESS_OR_EQUAL) and any driver file mentioned.\nΓÇó Minidump files: Enable Minidump in System Properties ΓåÆ Advanced ΓåÆ Startup and Recovery and attach the files from C:\Windows\Minidump.\nΓÇó Recent changes: Note any recent driver installations, Windows updates, or hardware changes.\nΓÇó Reproduce steps: If the BSOD occurs during a specific action, document the steps to reproduce.\n\nBasic troubleshooting: update drivers, run memory diagnostics (mdsched.exe), and check disk health. If unstable, collect logs and open a support ticket.`
    },
  ],

  network: [
    {
      id: 'faq11',
      q: 'WiΓÇæFi keeps disconnecting ΓÇö how can I stabilize the connection?',
          a: `Troubleshoot intermittent WiΓÇæFi disconnects with these steps:\n\nΓÇó Router & ISP: Restart your router and modem; verify if other devices have the same issue.\nΓÇó Signal & placement: Move closer to the router, avoid obstructions and sources of interference (microwaves, cordless phones).\nΓÇó Band selection: Try switching between 2.4GHz and 5GHz networks; 5GHz is faster but has shorter range.\nΓÇó Power settings: In Device Manager ΓåÆ Network adapters ΓåÆ Properties ΓåÆ Power Management, uncheck "Allow the computer to turn off this device".\nΓÇó Drivers & firmware: Update WiΓÇæFi adapter drivers and router firmware.\nΓÇó IP & DNS: Run ipconfig /release && ipconfig /renew && ipconfig /flushdns to reset network stack.\nΓÇó Advanced: Set a static channel on the router to avoid automatic channel switching that causes brief drops.\n\nIf connectivity issues persist, capture wireless logs and open a support ticket with SSID, adapter model, and approximate time(s) of disconnects.`
    },
    {
      id: 'faq12',
      q: 'Bluetooth paired but device won\'t connect or dropouts occur',
      a: `Bluetooth troubleshooting steps:\n\nΓÇó Remove & re-pair: Remove the device from Bluetooth settings and pair again.\nΓÇó Close interfering apps: Some apps may hold audio devices; close any app using audio.\nΓÇó Drivers: Update Bluetooth and audio drivers.\nΓÇó Power management: Disable Bluetooth power saving in Device Manager.\nΓÇó Firmware: Update headphones/headset firmware (if applicable).\n\nFor persistent issues, test the Bluetooth device with another phone/computer to rule out the accessory.`
    },
  ],

  warranty: [
    {
      id: 'faq20',
      q: 'How do I check my warranty status?',
      a: `To check warranty status:\n\nΓÇó Registered account: Sign in to your manufacturer account (e.g., Lenovo ID) and view registered devices.\nΓÇó Serial lookup: Use the service portal and enter your device serial number or SNID.\nΓÇó Purchase proof: Keep invoices or order numbers ready ΓÇö these accelerate claims.\n\nIf your device is not registered, register it with the serial number to get faster service and AMC reminders.`
    },
    {
      id: 'faq21',
      q: 'What does warranty cover vs AMC (Annual Maintenance Contract)?',
      a: `Typical coverage differences (may vary by vendor):\n\nΓÇó Manufacturer warranty: Covers manufacturing defects and hardware failures under normal use for the warranty period. Does not cover accidental damage or unauthorized modifications.\nΓÇó AMC / Extended warranty: Paid plans that extend coverage, may include on-site service, and sometimes accidental damage protection (check plan details).\n\nAlways read the plan terms ΓÇö what is excluded and the response time SLA.`
    },
    {
      id: 'faq22',
      q: 'How do I raise a warranty claim?',
      a: `Raising a warranty claim ΓÇö recommended steps:\n\nΓÇó Collect info: Device serial number, proof of purchase, description of the issue, photos/videos, and any error messages.\nΓÇó Contact support: Use the support portal or phone number on the website to create a ticket.\nΓÇó Diagnostics: Follow remote troubleshooting steps provided by support; be ready to run logs or diagnostic tools.\nΓÇó Service appointment: If hardware service is required, schedule an on-site visit or drop-off as instructed.\n\nKeep your ticket ID and follow up if updated timelines are needed.`
    },
  ],

  drivers: [
    {
      id: 'faq30',
      q: 'Where can I safely download drivers for my laptop?',
      a: `Best practices for driver downloads:\n\nΓÇó Official support site: Always use the laptop manufacturer's support page and enter your serial/model to get tested drivers.\nΓÇó Vendor GPU drivers: For GPUs, use Intel/AMD/NVIDIA official drivers if recommended by the vendor page.\nΓÇó Avoid third-party driver sites: Untrusted sources may contain incorrect or malicious drivers.\n\nIf you are unsure which driver to install, prefer vendor-provided utility programs (Lenovo Vantage) that recommend and apply the correct driver set.`
    },
    {
      id: 'faq31',
      q: 'I updated a driver and now the system is unstable ΓÇö how do I revert?',
      a: `How to roll back a problematic driver:\n\nΓÇó Device Manager rollback: Right-click the device ΓåÆ Properties ΓåÆ Driver ΓåÆ Roll Back Driver (if available).\nΓÇó Uninstall & reinstall: Use Device Manager to uninstall the device (check "Delete driver software"), then reboot and let Windows reinstall a stable driver.\nΓÇó System restore: If you have a System Restore point, revert to a previous state.\nΓÇó Safe Mode: Boot to Safe Mode to perform removals if normal mode is unstable.\n\nIf stability issues persist, capture event logs and contact support for a guided rollback.`
    },
  ],

  accessories: [
    {
      id: 'faq40',
      q: 'My charger or adapter is not powering the laptop reliably ΓÇö what should I check?',
      a: `Charger troubleshooting checklist:\n\nΓÇó Check rating: Ensure the replacement adapter matches required voltage and wattage. Undersized adapters may not charge under load.\nΓÇó Cable & connector: Inspect for damage and test with another compatible adapter.\nΓÇó Intermittent charging: Wiggle the connector gently ΓÇö if charging cuts in/out, port repair may be required.\nΓÇó Battery vs adapter: Remove battery (if removable) and test adapter-only boot (where supported) to isolate the issue.\n\nIf the adapter is faulty or pins are damaged, replace with an official or certified adapter.`
    },
    {
      id: 'faq41',
      q: 'External monitor not detected ΓÇö how can I fix this?',
      a: `Steps to diagnose external display issues:\n\nΓÇó Cable & port: Try a different cable and port (HDMI/DP/USB-C). Test the monitor with another device to rule out the monitor.\nΓÇó Input source: Ensure the external monitor input is set to the correct source.\nΓÇó Display settings: Windows ΓåÆ Display settings ΓåÆ Detect; set "Multiple displays" to Extend or Duplicate as needed.\nΓÇó GPU drivers: Update graphics drivers and check display adapter settings.\nΓÇó Adapter dongles: If using a passive adapter, test with an active adapter if the laptop requires DisplayPort alt-mode.\n\nIf multiple monitors fail across ports, collect logs and contact support ΓÇö include GPU model and adapter type.`
    },
  ],
};
