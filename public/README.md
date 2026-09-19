# DMCFS Official Brand Asset Pack

Professional SVG asset pack for DMCFS PVT. LTD. enterprise web applications.

## 📋 Asset Inventory

### Full Logo Files (`/full/`)

#### `dmcfs-logo-full.svg`
**Complete Official Logo**
- Contains: Emblem + DMCFS text + PVT. LTD. + Tagline (PEOPLE | PARTNERSHIP | PROGRESS)
- Best For: Website headers, main branding, printed materials
- Backgrounds: White or very light backgrounds
- Aspect Ratio: 1440×320 (4.5:1 landscape)
- Recommended Display Size: 400-600px wide

**Usage:**
```html
<img src="/assets/branding/dmcfs-logo-full.svg" alt="DMCFS" style="max-width: 600px; width: 100%; height: auto;">
```

---

#### `dmcfs-logo-light.svg`
**Logo for Light UI Backgrounds**
- Identical to `dmcfs-logo-full.svg`
- Designed for white, light gray, or very light colored backgrounds
- Use when your application has a light theme
- No background rectangle—use with white/light container

**Usage:**
```html
<!-- Light background container -->
<div style="background: #FFFFFF; padding: 20px;">
  <img src="/assets/branding/dmcfs-logo-light.svg" alt="DMCFS">
</div>
```

---

#### `dmcfs-logo-dark.svg`
**Logo for Dark UI Backgrounds**
- Official emblem and text preserved with optimized contrast for dark backgrounds
- Gray text lightened to #E0E0E0 for visibility on dark surfaces (#0B1220, #0F172A, #111827)
- Orange emblem and text remain exactly as official brand colors
- Use when your application has a dark theme

**Usage:**
```html
<!-- Dark background container -->
<div style="background: #0F172A; padding: 20px;">
  <img src="/assets/branding/dmcfs-logo-dark.svg" alt="DMCFS">
</div>
```

---

### Emblem/Mark Files (`/compact/`)

#### `dmcfs-mark.svg`
**DMCFS Emblem Only (Circular)**
- Contains: Only the official DMCFS circular orange emblem with white abstract pattern
- No text
- Perfect square format: 160×160
- Maintains full visual quality at any size

**Best For:**
- Favicon base (further scaled to 32×32)
- Sidebar collapsed state icon
- Mobile navigation icon
- Small UI areas
- Loading screen
- App icon backgrounds
- Social media profile images

**Usage:**
```html
<!-- Sidebar collapsed -->
<img src="/assets/branding/dmcfs-mark.svg" alt="DMCFS" style="width: 48px; height: 48px;">

<!-- Large icon -->
<img src="/assets/branding/dmcfs-mark.svg" alt="DMCFS" style="width: 256px; height: 256px;">
```

---

#### `dmcfs-mark-square.svg`
**DMCFS Emblem in Square Canvas**
- Official DMCFS emblem centered in a perfect square
- Aspect Ratio: 1:1 (200×200)
- Transparent background
- Ideal for social media (LinkedIn, Twitter, Facebook profile pictures)
- Perfect for app stores (iOS, Android, web app manifests)

**Best For:**
- LinkedIn company profile
- Twitter/X business profile
- Facebook business page
- App store icons
- Web app manifest icon (192px)
- Avatar placeholders

**Usage:**
```html
<!-- Social Media Avatar -->
<img src="/assets/branding/dmcfs-mark-square.svg" alt="DMCFS" style="width: 200px; height: 200px; border-radius: 8px;">

<!-- Web Manifest -->
<!-- In manifest.json: -->
{
  "icons": [
    { "src": "dmcfs-mark-square.svg", "sizes": "192x192", "type": "image/svg+xml" }
  ]
}
```

---

#### `dmcfs-logo-compact.svg`
**Compact Logo for Small Headers**
- Emblem + DMCFS text only (no PVT. LTD., no tagline)
- Reduced vertical height for tight spaces
- Aspect Ratio: 600×140 (4.3:1)
- Recommended Display Size: 200-400px wide

**Best For:**
- Application navigation bars
- Small page headers
- App toolbars
- Email headers
- Compact branding areas

**Usage:**
```html
<!-- App Navigation Bar -->
<nav style="background: white; padding: 10px 20px;">
  <img src="/assets/branding/dmcfs-logo-compact.svg" alt="DMCFS" style="max-width: 300px; height: auto;">
</nav>
```

---

### Favicon File (`/favicon/`)

#### `dmcfs-favicon.svg`
**Emblem for Browser Tab & App Icon**
- Official DMCFS emblem optimized for small display sizes
- Viewbox: 32×32
- Maintains visual integrity at 16×16 and 32×32 pixels
- Perfect for browser favicon use

**Best For:**
- Browser tab favicon (16×16, 32×32)
- iOS home screen icon (reference)
- Android app icon (reference)
- Browser bookmarks
- Application shortcuts

**Usage in HTML:**
```html
<!-- In <head> tag -->
<link rel="icon" type="image/svg+xml" href="/assets/branding/dmcfs-favicon.svg">
<link rel="icon" type="image/svg+xml" sizes="32x32" href="/assets/branding/dmcfs-favicon.svg">

<!-- For older browsers (PNG fallback) -->
<link rel="icon" type="image/png" href="/assets/branding/dmcfs-favicon-32x32.png">
```

---

## 🎨 Brand Color Reference

All colors in the DMCFS logos are exact to the official brand specification:

| Element | Color Code | RGB | Usage |
|---------|-----------|-----|-------|
| Emblem Circle | `#FF6600` | 255, 102, 0 | Main brand mark |
| DMCFS Text | `#FF6600` | 255, 102, 0 | Primary text |
| Divider Line | `#CCCCCC` | 204, 204, 204 | Accent line (light) |
| PVT. LTD. Text | `#7A7A7A` | 122, 122, 122 | Secondary text (light bg) |
| Tagline Text | `#7A7A7A` | 122, 122, 122 | Tertiary text (light bg) |
| Divider (Dark) | `#555555` | 85, 85, 85 | Accent line (dark bg) |
| PVT. LTD. (Dark) | `#E0E0E0` | 224, 224, 224 | Secondary text (dark bg) |

---

## 📂 Recommended Project Structure

```
your-project/
├── public/
│   └── assets/
│       └── branding/
│           ├── dmcfs-logo-full.svg
│           ├── dmcfs-logo-light.svg
│           ├── dmcfs-logo-dark.svg
│           ├── dmcfs-logo-compact.svg
│           ├── dmcfs-mark.svg
│           ├── dmcfs-mark-square.svg
│           └── dmcfs-favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── ...
│   └── ...
└── index.html
```

---

## 🚀 React / Vite Usage Examples

### Main Header with Logo
```jsx
// Header.jsx
import React from 'react';

export const Header = () => {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <img 
          src="/assets/branding/dmcfs-logo-full.svg" 
          alt="DMCFS" 
          className="h-20 w-auto"
        />
      </div>
    </header>
  );
};
```

### Sidebar with Collapsed Icon
```jsx
// Sidebar.jsx
import React, { useState } from 'react';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`bg-white transition-all ${collapsed ? 'w-20' : 'w-64'}`}>
      {collapsed ? (
        <img 
          src="/assets/branding/dmcfs-mark.svg" 
          alt="DMCFS" 
          className="w-16 h-16 p-2 mx-auto"
        />
      ) : (
        <img 
          src="/assets/branding/dmcfs-logo-compact.svg" 
          alt="DMCFS" 
          className="w-full p-4"
        />
      )}
      {/* Navigation items */}
    </aside>
  );
};
```

### Dark Mode Support
```jsx
// App.jsx
import React, { useState } from 'react';

export const App = () => {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? 'bg-slate-950 text-white' : 'bg-white text-black'}>
      <img 
        src={darkMode ? "/assets/branding/dmcfs-logo-dark.svg" : "/assets/branding/dmcfs-logo-light.svg"}
        alt="DMCFS" 
        className="h-20 w-auto"
      />
    </div>
  );
};
```

### Favicon Setup (Next.js)
```jsx
// pages/_document.jsx
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link rel="icon" type="image/svg+xml" href="/assets/branding/dmcfs-favicon.svg" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

---

## 🌐 Web App Manifest Usage

For PWA support (React PWA, Next.js, Vite):

```json
{
  "name": "DMCFS",
  "short_name": "DMCFS",
  "description": "DMCFS - People, Partnership, Progress",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#FF6600",
  "icons": [
    {
      "src": "/assets/branding/dmcfs-mark-square.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/assets/branding/dmcfs-mark-square.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/assets/branding/dmcfs-mark-square.svg",
      "sizes": "180x180",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ]
}
```

---

## 🎯 RTHC & RTCA Application Branding

**Important:** Keep DMCFS branding and application branding separate.

### Recommended Layout

```
┌─────────────────────────────────────────┐
│  [DMCFS LOGO]  |  RTHC (subtitle)      │  ← Header
│                |  Real-Time Head Count │
├─────────────────────────────────────────┤
│  [Application Content]                  │
└─────────────────────────────────────────┘
```

**React Example:**
```jsx
export const RTHCHeader = () => {
  return (
    <header>
      <div className="flex items-center gap-4">
        <img 
          src="/assets/branding/dmcfs-logo-compact.svg" 
          alt="DMCFS" 
          className="h-16"
        />
        <div className="border-l border-gray-300 pl-4">
          <h1 className="text-2xl font-bold text-orange-600">RTHC</h1>
          <p className="text-sm text-gray-600">Real-Time Head Count</p>
        </div>
      </div>
    </header>
  );
};
```

---

## ✅ Quality Assurance Checklist

Before deployment, verify:

- [ ] All SVG files render correctly in Chrome
- [ ] All SVG files render correctly in Firefox
- [ ] All SVG files render correctly in Safari
- [ ] All SVG files render correctly in Edge
- [ ] Favicon appears correctly in browser tab
- [ ] Logo colors match the official DMCFS brand
- [ ] Logo proportions remain unchanged
- [ ] All text is readable at small sizes
- [ ] Transparent backgrounds display correctly
- [ ] SVG files are self-contained (no external resources)
- [ ] No animation or interactivity
- [ ] File sizes are optimized

---

## 📐 Technical Specifications

All SVG files meet these requirements:

| Specification | Value |
|---|---|
| SVG Version | 1.1+ |
| Color Space | sRGB |
| Encoding | UTF-8 |
| Viewbox | Properly defined |
| Aspect Ratio | Preserved |
| Background | Transparent |
| External Resources | None |
| JavaScript | None |
| Animation | None |
| File Format | Valid SVG XML |

---

## 🔄 Scaling Guidelines

The SVG files scale infinitely without quality loss:

| Size | Use Case | Logo Variant |
|------|----------|---|
| 16×16 | Favicon (browser tab) | `dmcfs-favicon.svg` |
| 32×32 | Small icon | `dmcfs-favicon.svg` or `dmcfs-mark.svg` |
| 64×64 | Navigation icon | `dmcfs-mark.svg` |
| 128×128 | Medium icon | `dmcfs-mark.svg` |
| 256×256 | Social media avatar | `dmcfs-mark-square.svg` |
| 512×512 | App icon | `dmcfs-mark-square.svg` |
| 150px | Sidebar logo | `dmcfs-logo-compact.svg` |
| 300px | Navigation header | `dmcfs-logo-compact.svg` |
| 400-600px | Main header | `dmcfs-logo-full.svg` |
| 800px | Hero section | `dmcfs-logo-full.svg` |

---

## 🎓 Brand Guidelines

### DO ✓

- Use the official DMCFS logo without modification
- Maintain proper spacing around the logo
- Use correct color values (#FF6600 for orange, #7A7A7A for gray)
- Display the logo with adequate whitespace
- Preserve aspect ratio when scaling
- Use appropriate logo variant for context

### DON'T ✗

- Alter the logo design
- Change the colors
- Add drop shadows or effects
- Rotate or skew the logo
- Add text directly onto the logo
- Use low-quality raster versions
- Merge DMCFS with application names
- Create new versions without approval

---

## 📞 Support & Documentation

For questions about logo usage:

1. Review this README for specific use cases
2. Check the file descriptions above
3. Verify colors and proportions match the official reference
4. Test in your target browsers

---

## 📊 File Details

| File | Size | Type | Aspect | Best Size |
|------|------|------|--------|-----------|
| dmcfs-logo-full.svg | ~2.8KB | SVG | 4.5:1 | 400-600px |
| dmcfs-logo-light.svg | ~2.8KB | SVG | 4.5:1 | 400-600px |
| dmcfs-logo-dark.svg | ~2.8KB | SVG | 4.5:1 | 400-600px |
| dmcfs-logo-compact.svg | ~2.1KB | SVG | 4.3:1 | 200-400px |
| dmcfs-mark.svg | ~1.2KB | SVG | 1:1 | Any |
| dmcfs-mark-square.svg | ~1.2KB | SVG | 1:1 | Any |
| dmcfs-favicon.svg | ~0.9KB | SVG | 1:1 | 16-32px |

**Total Package Size: ~14.8KB** (Extremely lightweight)

---

## ✨ Professional Brand Standard

This asset pack maintains enterprise-grade professional standards:

✓ Exact color fidelity  
✓ Precise proportions  
✓ High-quality SVG vectors  
✓ Multi-platform compatibility  
✓ Responsive scaling  
✓ Dark/light theme support  
✓ Multiple formats for all use cases  
✓ Production-ready files  

---

**DMCFS PVT. LTD.**  
*People • Partnership • Progress*

---

Generated: 2026-09-19  
Format: Professional SVG Asset Pack  
Status: ✅ Production Ready  
