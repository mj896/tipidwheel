# TipidWheel (PWA - pwede sa phone at offline)

## Files
- `index.html` - HTML
- `css/style.css` - CSS
- `js/app.js` - logic (naayos na: tabs, avatar, collection, toast)
- `js/tailwind-config.js` - Tailwind config
- `js/pwa.js`, `sw.js`, `manifest.webmanifest`, `icons/` - para maging app at gumana offline

## Subukan sa computer (VS Code)
Open Folder > Live Server > Open with Live Server (localhost ay gumagana ang offline mode).

## Ilagay sa phone bilang app
Kailangan ng HTTPS link para ma-install sa phone. Pinakamadali:
1. Pumunta sa https://app.netlify.com/drop at i-drag ang buong folder na ito. Makakakuha ka ng link.
   (Pwede rin GitHub Pages.)
2. Buksan ang link sa phone gamit ang **Chrome** (Android) o **Safari** (iPhone).
   - Android: menu (tatlong tuldok) > **Install app** / **Add to Home screen**
   - iPhone: Share > **Add to Home Screen**
3. **Buksan ang app nang may internet ng isang beses** para ma-save ang lahat (Tailwind, icons, fonts, sounds).
   Pagkatapos nun, gagana na kahit offline.

## Tandaan
- Naka-save ang data sa phone mismo (localStorage), hindi sa internet.
- Kapag nag-update ka ng code, palitan ang `CACHE = 'tipidwheel-v1'` sa `sw.js` ng `v2` para ma-refresh.
