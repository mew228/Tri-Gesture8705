<div align="center">

<img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" />
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Framer_Motion-12-ff69b4?style=for-the-badge&logo=framer" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/Deployed_on-Vercel-000?style=for-the-badge&logo=vercel" />

</div>

<br/>

<div align="center">
  <h1>✦ Tri-Gesture</h1>
  <p><strong>The gesture-driven music discovery experience — swipe your way to your next favourite song.</strong></p>
  <a href="https://trigesture.vercel.app">🎵 Live Demo → trigesture.vercel.app</a>
</div>

---

## What Is Tri-Gesture?

**Tri-Gesture** is a premium, mobile-first music discovery web app inspired by the swipe mechanic of Tinder — but for music. Instead of profiles, you swipe through curated tracks. Three distinct gestures unlock three distinct discovery modes, giving you a rich, intelligent navigation through millions of songs.

No accounts. No playlists to build. Just pure, frictionless music exploration.

---

## ✦ The Three Gestures

| Gesture | What It Does |
|---|---|
| 👈 **Swipe Left** | *Random Explore* — Throws you a completely random track from across all genres |
| 👉 **Swipe Right** | *Deep Dive* — Dives into the current artist's top tracks |
| 👆 **Swipe Up** | *Smart Discovery* — Uses AI-style logic to surface a similar artist (80% similar, 20% wild card) |

You can also use **← → ↑ arrow keys** on desktop, and **tap the action buttons** at the bottom of each card.

---

## ✦ Features

- **30-second previews** — every card auto-plays a real audio preview
- **Liked Tracks drawer** — save songs with ♥ and revisit them
- **Genre seeding** — start from Pop, Hip-Hop, Rock, Indie, Electronic, Jazz, R&B, or Latin
- **Intelligent prefetch queue** — 3+ tracks are always ready ahead so swiping never stalls
- **Apple Music deep-link** — tap ↗ to open any track directly in Apple Music
- **PWA-ready** — installable on iOS / Android as a home screen app
- **Safe-area aware** — full notch + Dynamic Island support on iPhone

---

## ✦ Performance

Engineered for **120fps rendering** on modern displays:

- 🔲 `React.memo` on every card, row, and background component — skips unnecessary re-renders
- ⚡ Audio progress throttled via `requestAnimationFrame` + 250ms gate → 93% fewer `setState` calls
- 🎨 Ambient background uses **CSS opacity crossfade** (compositor thread) — no React re-mounts on track change
- 🖼 Album art served as **WebP 600×600** from iTunes — 25% smaller with higher visual fidelity
- 🧠 `Set<string>` for O(1) queue deduplication and liked-track lookups
- 🃏 Dragging runs on the **GPU compositor thread** via Framer Motion motion values — zero JS during swipe
- 📦 `optimizePackageImports` tree-shakes lucide-react & framer-motion to only used exports

---

## ✦ Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2 (App Router, React Server Components) |
| UI | React 19, Framer Motion 12, Tailwind CSS v4 |
| Icons | Lucide React |
| Music Data | Last.fm API (genre/artist discovery) |
| Previews & Art | iTunes Search API (no auth, free, 30s previews + WebP art) |
| Fonts | Inter + Outfit (Google Fonts, `display: swap`) |
| Hosting | Vercel (Edge Network, global CDN) |

---

## ✦ Getting Started

### Prerequisites

- Node.js 18+
- A free [Last.fm API key](https://www.last.fm/api/account/create)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/mew228/Tri-Gesture8705.git
cd Tri-Gesture8705/tri-gesture

# 2. Install dependencies
npm install

# 3. Add your Last.fm API key
cp .env.example .env.local
# Open .env.local and set LASTFM_API_KEY=your_key_here

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — pick a genre and start swiping.

---

## ✦ Environment Variables

| Variable | Description |
|---|---|
| `LASTFM_API_KEY` | Your Last.fm API key — required for track and artist data |

---

## ✦ Deployment

This project is configured for zero-config deployment on **Vercel**:

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add `LASTFM_API_KEY` as an environment variable in the Vercel dashboard
4. Deploy ✓

---

## ✦ How Discovery Works

```
Pick Genre
    │
    ▼
getTopTracksByGenre()  ──→  Last.fm tag API
    │
    ├── enrichTrack()  ──→  iTunes Search API (preview URL + WebP art)
    │
    ▼
SwipeCard displayed (auto-plays preview)
    │
    ├── Swipe Left  ──→  getExplorationTrack()  — random genre
    ├── Swipe Right ──→  getArtistTopTracks()   — same artist
    └── Swipe Up    ──→  getSmartDiscoveryTrack()
                            ├── 80% → getSimilarArtists() via Last.fm
                            └── 20% → random exploration
```

All API calls are cached for **1 hour** on the server (`next: { revalidate: 3600 }`) and served through Vercel's edge network.

---

## ✦ License

MIT — free to use, fork, and build upon.

---

<div align="center">
  <p>Built with ♥ and way too many swipes</p>
  <a href="https://trigesture.vercel.app">trigesture.vercel.app</a>
</div>
