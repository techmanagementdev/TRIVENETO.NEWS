-- Eventi finiti in errore per un problema tecnico della chiamata AI (17/11/2026): si riprovano
UPDATE events SET status='nuovo', status_note=NULL WHERE status='errore';
