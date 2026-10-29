# XAUUSD Signal Lab — GitHub Pages

Aplicație statică pentru browser mobil/PC. Nu plasează tranzacții și nu se conectează la contul FXPro/MT5.

## Date și limitări importante

- Prețul spot XAU/USD și istoricul intraday provin din XAUS API: `https://xaus.com/api/`.
- Prețul este o cotație spot orientativă, nu prețul executabil XAUUSD al FXPro. Poate diferi.
- API-ul oferă preț spot actualizat aproximativ la 60 de secunde și un istoric înregistrat periodic. Aplicația agregă aceste puncte în lumânări M5/M15/H1 **aproximative**; nu sunt lumânări reale ale brokerului și nu sunt date tick-by-tick.
- EMA 9/26, RSI 14, MACD, ATR și niveluri recente de suport/rezistență sunt calculate în browser. Semnalele sunt euristice, pot greși și nu reprezintă consultanță financiară.
- Nu există ordine automate. Pentru intrări/ieșiri, verifică mereu graficul FXPro/MT5.

## Publicare gratuită pe GitHub Pages

1. Deschide https://github.com și autentifică-te.
2. Apasă **+** → **New repository**.
3. Nume: `xauusd-signal-lab`. Setează **Public** și apasă **Create repository**.
4. În repo, apasă **Add file** → **Upload files**.
5. Dezarhivează acest ZIP pe telefon/PC și încarcă fișierele din interior (index.html, app.js, styles.css, manifest.json, .nojekyll, README.md). Nu încărca ZIP-ul ca singur fișier.
6. Apasă **Commit changes**.
7. În repository intră la **Settings** → **Pages**.
8. La **Build and deployment**, selectează **Deploy from a branch**; branch **main**, folder **/(root)**; apasă **Save**.
9. Așteaptă publicarea. În Pages va apărea adresa, de forma `https://NUME-UTILIZATOR.github.io/xauusd-signal-lab/`.
10. Deschide linkul în Safari pe iPhone. Pentru acces rapid: Share → Add to Home Screen.

## Utilizare

- Lasă aplicația deschisă pentru actualizări și alerte în aplicație.
- „Actualizează acum” reîncarcă datele istorice.
- Notificările browserului sunt opționale și depind de permisiunile și comportamentul iOS/Safari. Nu te baza pe alerte dacă aplicația este închisă sau suspendată.
- Dacă apare „Date vechi” sau „Eroare date”, nu folosi semnalul.

## Depanare

- Dacă prețul nu apare, deschide `https://xaus.com/api/v1/spot?compact=1` în browser ca să verifici dacă API-ul răspunde.
- Dacă istoricul nu se încarcă, verifică `https://xaus.com/api/v1/intraday?symbol=xau&hours=48`.
- GitHub Pages găzduiește fișiere statice; nu poate rula serverul Python/MetaTrader5 și nu oferă cotația exactă FXPro.
