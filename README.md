# XAUUSD Signal Lab — GitHub Pages

A static browser-based XAUUSD analysis dashboard for desktop and mobile. It does not place trades and does not connect to an FXPro/MT5 account.

## Data sources and TradingView integration

- The indicative XAU/USD spot price and intraday history are supplied by XAUS API (`https://xaus.com/api/`).
- This is an independent spot reference, not the executable FXPro quote. Broker spreads, pricing and candles can differ.
- The app aggregates periodic spot observations into approximate M5/M15/H1 candles. These are not broker OHLC candles or tick-by-tick data.
- EMA 9/26, RSI 14, MACD, ATR, support and resistance are calculated in the browser from the XAUS data.
- The embedded TradingView Technical Analysis widget displays an independent TradingView view for `OANDA:XAUUSD`. It is a visual reference only. The app does not scrape TradingView, extract its widget values, or treat them as a programmatic data feed.
- TradingView's displayed symbol/provider may differ from FXPro. Always compare the quote and chart on the broker platform.
- Signals are heuristic and may be wrong. They are not financial advice.

## Indicators and signal logic

- EMA 9 / EMA 26
- RSI 14
- MACD
- ATR 14
- M15 and H1 trend confirmation
- Recent support and resistance zones
- Indicative entry, stop and target levels derived from ATR

No automated orders are sent.

## Publish on GitHub Pages

1. Open the repository on GitHub.
2. Upload the contents of this ZIP to the repository root (not the ZIP file itself).
3. Commit the changes to the `main` branch.
4. Open **Settings → Pages**.
5. Select **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
6. Open the published GitHub Pages URL.

## Important limitations

- GitHub Pages hosts static files. It cannot run a local MT5 terminal or the MetaTrader5 Python package.
- The XAUS API can be unavailable, delayed, or stale. Do not use a stale-data signal.
- TradingView is embedded as a third-party widget. Its values are not read by this app's signal engine.
- Browser notifications may not work while the page is suspended or closed, especially on mobile.
- Verify all setups on the FXPro/MT5 chart before making a trading decision.
