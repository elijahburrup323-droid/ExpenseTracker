// 50 budget-related icons — each has a key, label, SVG path(s), and style (fill vs stroke)
export const ICON_CATALOG = [
  // --- Essentials / Needs ---
  { key: "check-circle", label: "Check Circle", style: "fill", viewBox: "0 0 20 20", path: `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>` },
  { key: "home", label: "Home", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/>` },
  { key: "lightning", label: "Lightning", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>` },
  { key: "shield", label: "Shield", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>` },
  { key: "heart", label: "Heart", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>` },
  { key: "droplet", label: "Droplet", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 21c-4.418 0-8-3.582-8-8 0-4 8-12 8-12s8 8 8 12c0 4.418-3.582 8-8 8z"/>` },
  // --- Wants / Lifestyle ---
  { key: "star", label: "Star", style: "fill", viewBox: "0 0 20 20", path: `<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>` },
  { key: "sparkles", label: "Sparkles", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>` },
  { key: "gift", label: "Gift", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a4 4 0 00-4-4c-1.5 0-2.7.8-3.4 2M12 8V6a4 4 0 014-4c1.5 0 2.7.8 3.4 2M6 8h12v2H6V8zm0 2v8a2 2 0 002 2h8a2 2 0 002-2v-8"/>` },
  { key: "cake", label: "Cake", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546V20a1 1 0 001 1h16a1 1 0 001-1v-4.454zM3 15.546V12a2 2 0 012-2h14a2 2 0 012 2v3.546M9 10V6m6 4V6m-3-3v3"/>` },
  { key: "music", label: "Music", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>` },
  { key: "film", label: "Film", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>` },
  { key: "gamepad", label: "Gamepad", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>` },
  { key: "camera", label: "Camera", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>` },
  { key: "palette", label: "Palette", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>` },
  // --- Savings / Investment ---
  { key: "chart-line", label: "Trend Up", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>` },
  { key: "chart-bar", label: "Bar Chart", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>` },
  { key: "chart-pie", label: "Pie Chart", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>` },
  { key: "banknotes", label: "Cash", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zm10 3a2 2 0 100 4 2 2 0 000-4zm-6 2h.01M18 12h.01"/>` },
  { key: "currency", label: "Dollar", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>` },
  { key: "piggy-bank", label: "Piggy Bank", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a5 5 0 00-10 0v2M3 13h2a2 2 0 012 2v2a2 2 0 01-2 2H3v-6zm18 0h-2a2 2 0 00-2 2v2a2 2 0 002 2h2v-6zM7 9h10v4a5 5 0 01-10 0V9zm3 3h.01M14 12h.01"/>` },
  { key: "vault", label: "Vault", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM12 17a3 3 0 100-6 3 3 0 000 6zm0-4h.01M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2"/>` },
  // --- Food & Dining ---
  { key: "utensils", label: "Dining", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 3v8h4V3M5 3v18m14-7V3c-2.5 0-5 2-5 5v3h5zm0 0v7"/>` },
  { key: "coffee", label: "Coffee", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M5 8h12v9a4 4 0 01-4 4H9a4 4 0 01-4-4V8zm3-5v3m4-3v3m4-3v3"/>` },
  { key: "shopping-cart", label: "Groceries", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>` },
  { key: "shopping-bag", label: "Shopping", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>` },
  // --- Transport ---
  { key: "car", label: "Car", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM5 17H3v-4l2-5h10l2 5h2a1 1 0 011 1v3h-2"/>` },
  { key: "airplane", label: "Travel", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 19l-3 3m3-3l3 3m-3-3V2m0 0L9 5m3-3l3 3M5 12h14"/>` },
  { key: "map", label: "Map", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>` },
  { key: "globe", label: "Globe", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>` },
  // --- Health & Medical ---
  { key: "medical", label: "Medical", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6m14-4V6a2 2 0 00-2-2h-2m-4 0H8a2 2 0 00-2 2v2m0 4v6a2 2 0 002 2h8a2 2 0 002-2v-6"/>` },
  { key: "bandage", label: "Health", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/>` },
  // --- Education ---
  { key: "academic", label: "Education", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/>` },
  { key: "book", label: "Book", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>` },
  // --- Housing / Bills ---
  { key: "office", label: "Office", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>` },
  { key: "key", label: "Rent/Mortgage", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>` },
  { key: "wrench", label: "Repairs", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17l-5.1 5.1a2.121 2.121 0 01-3-3l5.1-5.1m0 0L15 4.5A2.121 2.121 0 0118 1.5l.82.82a2.121 2.121 0 010 3L11.42 15.17zm0 0L9 12.75"/>` },
  // --- Communication ---
  { key: "phone", label: "Phone", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>` },
  { key: "wifi", label: "Internet", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>` },
  { key: "device", label: "Device", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>` },
  // --- Insurance / Legal ---
  { key: "document", label: "Document", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>` },
  { key: "clipboard", label: "Insurance", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01"/>` },
  { key: "scale", label: "Legal", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>` },
  // --- Children / Family ---
  { key: "users", label: "Family", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>` },
  { key: "puzzle", label: "Kids", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1H3a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>` },
  { key: "pet", label: "Pets", style: "fill", viewBox: "0 0 20 20", path: `<path d="M6 3.5a2.5 2.5 0 115 0v1a2.5 2.5 0 01-5 0v-1zm7 0a2.5 2.5 0 115 0v1a2.5 2.5 0 01-5 0v-1zM3 8.5a2.5 2.5 0 115 0v1a2.5 2.5 0 01-5 0v-1zm11 0a2.5 2.5 0 115 0v1a2.5 2.5 0 01-5 0v-1zM10 12a4 4 0 100 8 4 4 0 000-8z"/>` },
  // --- Fitness / Sports ---
  { key: "dumbbell", label: "Fitness", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M6 6v12M18 6v12M6 12h12M4 8h4M16 8h4M4 16h4M16 16h4"/>` },
  { key: "running", label: "Sports", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M13 5a2 2 0 100-4 2 2 0 000 4zm-1 1l-3 8 4 2 1 5h2l-1-6-3-2 1-3 3 1h3l-1-3-4-1-1-1z"/>` },
  // --- Clothing / Personal ---
  { key: "scissors", label: "Personal Care", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/>` },
  // --- Recurring / Subscriptions ---
  { key: "refresh", label: "Subscription", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>` },
  { key: "calendar", label: "Recurring", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>` },
  { key: "clock", label: "Time", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>` },
  // --- Taxes / Government ---
  { key: "receipt", label: "Taxes", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>` },
  { key: "building", label: "Government", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>` },
  // --- Charity / Giving ---
  { key: "hand-heart", label: "Charity", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"/>` },
  // --- Emergency / Misc ---
  { key: "exclamation", label: "Emergency", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>` },
  { key: "cog", label: "Miscellaneous", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>` },
  { key: "tag", label: "Tag", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>` },
  { key: "flag", label: "Goal", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z"/>` },
  { key: "sun", label: "Vacation", style: "stroke", viewBox: "0 0 24 24", path: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>` },
]

export const COLOR_OPTIONS = [
  { key: "blue",   label: "Blue",   css: "text-blue-500",   bg: "bg-blue-100",   ring: "ring-blue-500"   },
  { key: "green",  label: "Green",  css: "text-green-500",  bg: "bg-green-100",  ring: "ring-green-500"  },
  { key: "gold",   label: "Gold",   css: "text-yellow-500", bg: "bg-yellow-100", ring: "ring-yellow-500" },
  { key: "red",    label: "Red",    css: "text-red-500",    bg: "bg-red-100",    ring: "ring-red-500"    },
  { key: "purple", label: "Purple", css: "text-purple-500", bg: "bg-purple-100", ring: "ring-purple-500" },
  { key: "pink",   label: "Pink",   css: "text-pink-500",   bg: "bg-pink-100",   ring: "ring-pink-500"   },
  { key: "indigo", label: "Indigo", css: "text-indigo-500", bg: "bg-indigo-100", ring: "ring-indigo-500" },
  { key: "teal",   label: "Teal",   css: "text-teal-500",   bg: "bg-teal-100",   ring: "ring-teal-500"   },
  { key: "orange", label: "Orange", css: "text-orange-500", bg: "bg-orange-100", ring: "ring-orange-500" },
  { key: "gray",   label: "Gray",   css: "text-gray-500",   bg: "bg-gray-100",   ring: "ring-gray-500"   },
]

export function renderIconSvg(iconKey, colorKey, sizeClass) {
  const icon = ICON_CATALOG.find(i => i.key === iconKey)
  if (!icon) return defaultIconSvg(sizeClass)

  const colorObj = COLOR_OPTIONS.find(c => c.key === colorKey) || COLOR_OPTIONS[0]
  const colorClass = colorObj.css

  if (icon.style === "fill") {
    return `<svg class="${sizeClass} ${colorClass}" fill="currentColor" viewBox="${icon.viewBox}">${icon.path}</svg>`
  }
  return `<svg class="${sizeClass} ${colorClass}" fill="none" viewBox="${icon.viewBox}" stroke="currentColor" stroke-width="2">${icon.path}</svg>`
}

export function defaultIconSvg(sizeClass) {
  return `<svg class="${sizeClass} text-gray-300" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd"/>
  </svg>`
}

export function iconFor(iconKey, colorKey) {
  if (!iconKey) return defaultIconSvg("h-5 w-5")
  return renderIconSvg(iconKey, colorKey, "h-5 w-5")
}

export function escapeHtml(str) {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

export function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
