# Maryam Irekeola — Official Website & Platform

A modern, responsive, high-performance website for **Maryam Irekeola** — PhD Researcher at Kingston University, UX Researcher, Founder of **InsightSpace.Co**, speaker, and research communication advocate.

Inspired by the design architecture and elegance of [olaarowolo.com](https://olaarowolo.com/).

---

## 🌟 Key Features

1. **Brand & Visual Aesthetics**:
   - Styled with **Tailwind CSS**, featuring custom brand palettes (Teal/Emerald for behavioural and sustainability science, Purple for InsightSpace.Co, Slate/Navy for dark mode).
   - Paired typography: **Plus Jakarta Sans** (headings) and **Inter** (body text).
   - Elegant Bento Grid cards with subtle borders, soft shadows, and hover micro-interactions.
   - Ambient background gradient blobs and pulse animations.

2. **Light / Dark Mode**:
   - Full dark mode support toggle with automatic persistence via `localStorage` and system preference detection.

3. **Hero Section with Rotating Badge**:
   - Cyclical animated status pill highlighting her diverse roles (PhD Researcher, InsightSpace.Co Founder, UX Researcher, Research Communication Advocate).
   - High-impact value proposition headline and direct CTAs.

4. **InsightSpace.Co Spotlight**:
   - High-profile feature card with direct links to **TikTok** and **Instagram**.
   - Breakdown of what the platform is, who it is for, and the three core pillars (Demystifying Jargon, Actionable Communication, Researcher Resilience).

5. **Research & Publications Bento Grid**:
   - **BAM 2026 Conference Paper**: Cognitive biases in sustainability decision-making.
   - **EU 6G-VERSUS Project Deliverable**: Multidimensional impact assessment framework.
   - **Hackathon Pedagogy Toolkit**: University-wide experiential learning resource.
   - **Kingston Hive Behavioural Impact Framework**: Community resilience evaluation model.

6. **Speaking & Workshops**:
   - Curated list of conferences, panels, and academic symposiums.
   - Masterclass offerings for academic cohorts and product/strategy teams.

7. **Interactive Modals & Utilities**:
   - **Global Search Modal** (`Cmd/Ctrl + K` or search button) to instantly search all sections and publications.
   - **Consultation / Speaking Booking Modal** for scheduling 1:1 discussions.
   - **Floating Accessibility Font Scaler** (A+ / A / A-) to adjust typography size dynamically.
   - **Interactive Contact Form** with real-time submission confirmation.

---

## 📁 File Structure

```
mi/
├── index.html              # Main HTML document with all sections and semantic markup
├── assets/
│   ├── css/
│   │   └── custom.css      # Custom animations, glassmorphism, and font scaler styles
│   └── js/
│       └── main.js         # Theme toggle, search modal, hero badge rotation, booking dialog
└── README.md               # Documentation & setup guide
```

---

## 🚀 How to Run Locally

Because the project is built with standard web technologies (HTML5 + Tailwind CSS + vanilla JS), you can preview it immediately:

### Option 1: Python HTTP Server (Built-in)
In this project directory, run:
```bash
python3 -m http.server 3000
```
Then open your browser and navigate to:
```
http://localhost:3000
```

### Option 2: Direct File Open
Double-click `index.html` or open it directly in Chrome, Firefox, Safari, or Edge.

---

## 🌐 Deployment Options

1. **GitHub Pages**:
   - Push this repository to GitHub and enable **GitHub Pages** under repository *Settings > Pages*.
2. **Vercel / Netlify**:
   - Drag and drop this folder directly into the Netlify or Vercel dashboard for instant SSL deployment with zero build steps required.

