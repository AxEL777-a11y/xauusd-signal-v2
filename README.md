# XAUUSD Signal Lab — GitHub Pages + FXPro MT5 (read only)

The dashboard tries the FXPro MT5 feed first. If MT5 is unavailable, it clearly labels and displays the independent spot API as a fallback. The dashboard and EA never place or manage orders.

## Publish the updated site

Replace the repository's `index.html`, `app.js`, `styles.css`, and `README.md` with the files from this folder, then commit the changes. GitHub Pages will publish the update from the configured branch. No credentials belong in these files.

## Connect MT5 on the same Windows PC

1. Start `mt5-bridge/bridge.py` with `py bridge.py` and leave PowerShell open.
2. In MT5, allow WebRequest to `http://127.0.0.1:8765` under **Tools → Options → Expert Advisors**.
3. Compile `mt5-bridge/GOLD_Export.mq5` in MetaEditor (F7), then attach it to the FXPro `GOLD` M5 chart. The exporter sends up to 500 M5 candles and a snapshot every two seconds.
4. Open the GitHub Pages site on the same PC. Allow the browser's local network access prompt if it appears. The price card should say **FXPRO GOLD · LIVE** and show Bid/Ask. The chart uses broker M5 candles; M15/H1 candles are aggregated from that M5 history.
5. Check `http://127.0.0.1:8765/data` on the PC. It should show `connected:true` and the latest snapshot. If it stays false, the MT5 exporter is not reaching the local bridge.

The browser will show **MT5 offline · spot extern** when the bridge is unreachable. That status is deliberate; the old spot feed must not be mistaken for an FXPro quote.

## Phone access

`127.0.0.1` means the device itself, so a phone cannot reach the PC's local bridge using that address. Phone access requires a publicly reachable HTTPS backend or tunnel with access control and CORS enabled. Once configured, open the Pages app with `?feed=https://YOUR-SECURED-HOST/data` (replace with your actual HTTPS endpoint). Do not put passwords, tunnel tokens, or other secrets in the repository or URL. The included local bridge is for loopback use and must not be exposed directly to the public internet.

## What the live feed means

- Bid and Ask are from the FXPro MT5 terminal's exact chart symbol (including a broker suffix, if present).
- M5 candles are read from MT5. The app derives M15 and H1 candles from those M5 bars; up to 500 bars provide roughly 41 hours of history.
- EMA, RSI, MACD, ATR and the signal remain analytical estimates calculated in the browser. They are informational, can be wrong, and do not execute trades.
- A live quote does not establish that a signal is profitable or that the displayed quote is an executable order price.
