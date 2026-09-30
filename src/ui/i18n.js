(() => {
  const translations = {
    de: {
      'window.ready': 'DEIN PORTAL IST BEREIT', 'window.minimize': 'Minimieren', 'window.maximize': 'Maximieren', 'window.restore': 'Wiederherstellen', 'window.close': 'Schließen',
      'brand.caption': 'DEINE WELTEN. EIN ORT.', 'nav.label': 'NAVIGATION', 'nav.aria': 'Hauptnavigation', 'nav.library': 'Bibliothek', 'nav.activity': 'Aktivität', 'nav.settings': 'Einstellungen', 'nav.about': 'Über Cinderport', 'language.label': 'SPRACHE',
      'radar.title': 'UPDATE-RADAR', 'radar.checking': 'Versionen werden geprüft …', 'radar.ready': 'Alle installierten Apps sind aktuell.', 'radar.processing': 'Download oder Installation läuft.', 'radar.availableOne': 'Ein Update ist verfügbar.', 'radar.availableMany': '{count} Updates sind verfügbar.', 'radar.error': 'Verbindung prüfen und erneut versuchen.',
      'home.kicker': 'DEIN HUB FÜR ALLE WELTEN', 'home.title': 'Willkommen zurück', 'home.subtitle': 'Deine Spiele und Tools, immer bereit für den nächsten Start.', 'home.autoNote': 'Installierte Apps werden beim Öffnen automatisch auf neue Versionen geprüft und aktualisiert.',
      'hero.badge': 'DIE SAMMLUNG WÄCHST', 'hero.line1': 'Neue Welten.', 'hero.line2': 'Ein Portal.', 'hero.subtitle': 'Spiele und Tools an einem Ort. Mehr ist auf dem Weg.', 'hero.footer': 'ENTDECKEN. INSTALLIEREN. STARTEN.', 'hero.artAlt': 'Pixel-Art-Portal vor einer dunklen Landschaft',
      'library.kicker': '// DEINE SAMMLUNG', 'library.title': 'Alle Apps', 'status.checking': 'Versionen werden geprüft', 'status.ready': 'Alles auf dem neuesten Stand', 'status.update': 'Ein Update ist verfügbar', 'status.work': 'Download oder Installation läuft', 'status.error': 'Einige Prüfungen fehlgeschlagen',
      'action.refresh': 'Updates prüfen', 'action.refreshNow': 'Jetzt prüfen', 'action.install': 'Installieren', 'action.update': 'Aktualisieren', 'action.launch': 'Starten', 'action.retry': 'Erneut versuchen', 'action.releases': 'Releases', 'action.folder': 'Dateien öffnen', 'action.itch': 'itch.io',
      'card.installed': 'INSTALLIERT', 'card.notInstalled': 'NICHT INSTALLIERT', 'card.available': 'VERFÜGBAR', 'card.checking': 'PRÜFE RELEASE', 'card.upToDate': 'AKTUELL', 'card.update': 'UPDATE VERFÜGBAR', 'card.downloading': 'DOWNLOAD LÄUFT', 'card.installing': 'WIRD INSTALLIERT', 'card.error': 'PRÜFUNG FEHLGESCHLAGEN', 'card.version': 'VERSION {version}', 'card.latest': 'NEU: {version}', 'card.noVersion': 'UNBEKANNT', 'card.downloadProgress': 'Download {percent} %',
      'activity.kicker': 'STATUSZENTRALE', 'activity.subtitle': 'Hier siehst du den Stand deiner Apps und Downloads.', 'activity.app': 'APP', 'activity.installed': 'INSTALLIERT', 'activity.latest': 'NEUESTE VERSION', 'activity.status': 'STATUS',
      'settings.kicker': 'DEIN STARTPUNKT', 'settings.subtitle': 'Passe an, wie Cinderport auf deinem PC startet.', 'settings.autostartTitle': 'Mit Windows starten', 'settings.autostartDescription': 'Cinderport öffnet sich nach der Anmeldung automatisch und prüft installierte Apps auf Updates.', 'settings.toggleAria': 'Autostart umschalten', 'settings.enabled': 'Autostart ist aktiviert.', 'settings.disabled': 'Autostart ist deaktiviert.', 'settings.unavailable': 'Autostart ist in der Entwicklungsversion nicht verfügbar.', 'settings.changeError': 'Autostart konnte nicht geändert werden.',
      'settings.selfUpdateTitle': 'Cinderport Updates', 'settings.selfUpdateDescription': 'Neue Launcher-Versionen werden automatisch geladen und beim nächsten Beenden installiert.', 'self.idle': 'Suche nach Updates …', 'self.checking': 'Suche nach Updates …', 'self.ready': 'Cinderport ist aktuell.', 'self.downloading': 'Cinderport {version} wird geladen: {progress} %', 'self.downloaded': 'Version {version} ist bereit. Jetzt neu starten oder später schließen.', 'self.error': 'Updateprüfung fehlgeschlagen. Erneut versuchen.', 'self.unavailable': 'In der Entwicklungsversion nicht verfügbar.', 'self.check': 'Erneut prüfen', 'self.restart': 'Jetzt neu starten',
      'prompt.kicker': 'DEIN PORTAL, IMMER BEREIT', 'prompt.title': 'Cinderport mit Windows starten?', 'prompt.description': 'Wenn du Autostart aktivierst, öffnet sich Cinderport nach der Anmeldung und hält deine installierten Apps automatisch aktuell. Du kannst das jederzeit in den Einstellungen ändern.', 'prompt.later': 'Später', 'prompt.enable': 'Autostart aktivieren',
      'about.kicker': 'EIN PORTAL FÜR ALLES', 'about.line1': 'DEINE WELTEN.', 'about.line2': 'DEIN STARTPUNKT.', 'about.p1': 'Cinderport bringt Spiele und Tools von Staatseigentum an einen Ort. Die Bibliothek wächst mit neuen Veröffentlichungen. App-Releases kommen direkt aus den offiziellen GitHub-Repositories; Downloads werden anhand ihrer SHA-256-Prüfwerte verifiziert.', 'about.p2': 'Installierte Apps und Cinderport selbst werden beim Start geprüft. Updates werden automatisch geladen.',
      'app.embercrown.description': 'Errichte ein Königreich im Dunkeln. Halte sein letztes Licht am Leben.', 'app.embercrown.detail': 'Ein Reich aus Asche, Ritualen und Entscheidungen.',
      'app.kollaps.description': 'Vom Meteoriten zum Schwarzen Loch. Jede Masse zählt.', 'app.kollaps.detail': 'Ein ganzes Universum wartet auf den nächsten Kollaps.',
      'app.streamplan.description': 'Baue deinen Streamplan und bring deine Woche in Form.', 'app.streamplan.detail': 'Planen, gestalten und direkt exportieren.',
      'error.release_http': 'GitHub antwortet mit HTTP {detail}.', 'error.rate_limit': 'GitHub-Limit erreicht. Bitte später erneut prüfen.', 'error.asset_missing': 'Im neuesten Release fehlt das Windows-Paket.', 'error.digest_missing': 'Für das Paket fehlt ein SHA-256-Prüfwert.', 'error.invalid_version': 'Die Release-Version ist ungültig.', 'error.download_failed': 'Der Download ist fehlgeschlagen.', 'error.download_too_large': 'Das Paket ist zu groß.', 'error.checksum': 'Die Datei konnte nicht verifiziert werden.', 'error.installer_failed': 'Der Installer ist mit Code {detail} fehlgeschlagen.', 'error.exe_missing': 'Installation beendet, App-Datei nicht gefunden.', 'error.unknown': 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.'
    },
    en: {
      'window.ready': 'YOUR PORTAL IS READY', 'window.minimize': 'Minimize', 'window.maximize': 'Maximize', 'window.restore': 'Restore', 'window.close': 'Close',
      'brand.caption': 'YOUR WORLDS. ONE PLACE.', 'nav.label': 'NAVIGATION', 'nav.aria': 'Main navigation', 'nav.library': 'Library', 'nav.activity': 'Activity', 'nav.settings': 'Settings', 'nav.about': 'About Cinderport', 'language.label': 'LANGUAGE',
      'radar.title': 'UPDATE RADAR', 'radar.checking': 'Checking versions …', 'radar.ready': 'All installed apps are up to date.', 'radar.processing': 'Download or installation in progress.', 'radar.availableOne': 'One update is available.', 'radar.availableMany': '{count} updates are available.', 'radar.error': 'Check your connection and try again.',
      'home.kicker': 'YOUR HUB FOR EVERY WORLD', 'home.title': 'Welcome back', 'home.subtitle': 'Your games and tools, ready whenever you are.', 'home.autoNote': 'Installed apps are checked and updated automatically when Cinderport opens.',
      'hero.badge': 'THE COLLECTION IS GROWING', 'hero.line1': 'New worlds.', 'hero.line2': 'One portal.', 'hero.subtitle': 'Games and tools in one place. More are on the way.', 'hero.footer': 'DISCOVER. INSTALL. LAUNCH.', 'hero.artAlt': 'Pixel-art portal against a dark landscape',
      'library.kicker': '// YOUR COLLECTION', 'library.title': 'All apps', 'status.checking': 'Checking versions', 'status.ready': 'Everything is up to date', 'status.update': 'An update is available', 'status.work': 'Downloading or installing', 'status.error': 'Some checks failed',
      'action.refresh': 'Check updates', 'action.refreshNow': 'Check now', 'action.install': 'Install', 'action.update': 'Update', 'action.launch': 'Launch', 'action.retry': 'Try again', 'action.releases': 'Releases', 'action.folder': 'Open files', 'action.itch': 'itch.io',
      'card.installed': 'INSTALLED', 'card.notInstalled': 'NOT INSTALLED', 'card.available': 'AVAILABLE', 'card.checking': 'CHECKING RELEASE', 'card.upToDate': 'UP TO DATE', 'card.update': 'UPDATE AVAILABLE', 'card.downloading': 'DOWNLOADING', 'card.installing': 'INSTALLING', 'card.error': 'CHECK FAILED', 'card.version': 'VERSION {version}', 'card.latest': 'NEW: {version}', 'card.noVersion': 'UNKNOWN', 'card.downloadProgress': 'Download {percent}%',
      'activity.kicker': 'STATUS CENTER', 'activity.subtitle': 'See what is happening with your apps and downloads.', 'activity.app': 'APP', 'activity.installed': 'INSTALLED', 'activity.latest': 'LATEST VERSION', 'activity.status': 'STATUS',
      'settings.kicker': 'YOUR STARTING POINT', 'settings.subtitle': 'Choose how Cinderport starts on your PC.', 'settings.autostartTitle': 'Start with Windows', 'settings.autostartDescription': 'Cinderport opens after sign-in and checks installed apps for updates automatically.', 'settings.toggleAria': 'Toggle startup with Windows', 'settings.enabled': 'Startup is enabled.', 'settings.disabled': 'Startup is disabled.', 'settings.unavailable': 'Startup is unavailable in the development version.', 'settings.changeError': 'Could not change startup setting.',
      'settings.selfUpdateTitle': 'Cinderport updates', 'settings.selfUpdateDescription': 'New launcher versions download automatically and install when you close Cinderport.', 'self.idle': 'Checking for updates …', 'self.checking': 'Checking for updates …', 'self.ready': 'Cinderport is up to date.', 'self.downloading': 'Downloading Cinderport {version}: {progress}%', 'self.downloaded': 'Version {version} is ready. Restart now or close later.', 'self.error': 'Could not check for updates. Try again.', 'self.unavailable': 'Unavailable in the development build.', 'self.check': 'Check again', 'self.restart': 'Restart now',
      'prompt.kicker': 'YOUR PORTAL, ALWAYS READY', 'prompt.title': 'Start Cinderport with Windows?', 'prompt.description': 'If you enable startup, Cinderport opens after sign-in and keeps your installed apps up to date. You can change this anytime in Settings.', 'prompt.later': 'Later', 'prompt.enable': 'Enable startup',
      'about.kicker': 'ONE PORTAL FOR IT ALL', 'about.line1': 'YOUR WORLDS.', 'about.line2': 'YOUR STARTING POINT.', 'about.p1': 'Cinderport brings Staatseigentum games and tools together. The library grows with new releases. App downloads come from the official GitHub repositories and are verified against their published SHA-256 digests.', 'about.p2': 'Installed apps and Cinderport itself are checked at startup. New versions download automatically.',
      'app.embercrown.description': 'Build a kingdom in the dark. Keep its last light alive.', 'app.embercrown.detail': 'A realm of ash, rituals, and choices.',
      'app.kollaps.description': 'From meteoroid to black hole. Every bit of mass counts.', 'app.kollaps.detail': 'A whole universe awaits the next collapse.',
      'app.streamplan.description': 'Build a streaming schedule and bring your week into shape.', 'app.streamplan.detail': 'Plan, design, and export in one place.',
      'error.release_http': 'GitHub returned HTTP {detail}.', 'error.rate_limit': 'GitHub rate limit reached. Please try later.', 'error.asset_missing': 'The latest release has no matching Windows package.', 'error.digest_missing': 'This package has no SHA-256 digest.', 'error.invalid_version': 'The release version is invalid.', 'error.download_failed': 'The download failed.', 'error.download_too_large': 'The package is too large.', 'error.checksum': 'The file could not be verified.', 'error.installer_failed': 'The installer failed with code {detail}.', 'error.exe_missing': 'Installation finished, but the app file was not found.', 'error.unknown': 'Something went wrong. Please try again.'
    }
  };

  let locale = localStorage.getItem('cinderport-locale');
  if (!translations[locale]) locale = 'en';

  function t(key, vars = {}) {
    const message = translations[locale][key] || translations.de[key] || key;
    return message.replace(/\{(\w+)\}/g, (_match, name) => String(vars[name] ?? ''));
  }
  function apply() {
    document.documentElement.lang = locale;
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(element => { element.title = t(element.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-alt]').forEach(element => { element.alt = t(element.dataset.i18nAlt); });
    document.querySelectorAll('[data-lang]').forEach(element => { element.classList.toggle('active', element.dataset.lang === locale); });
  }
  function setLocale(next) {
    if (!translations[next]) return;
    locale = next;
    localStorage.setItem('cinderport-locale', next);
    apply();
    window.dispatchEvent(new Event('cinderport-language-changed'));
  }
  async function initialize() {
    if (!localStorage.getItem('cinderport-locale')) {
      const system = await window.cinderport.systemLocale();
      locale = system?.toLowerCase().startsWith('de') ? 'de' : 'en';
    }
    apply();
  }
  window.I18N = { t, apply, setLocale, initialize, get locale() { return locale; } };
})();
