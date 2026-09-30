(() => {
  const { t } = window.I18N;
  let apps = [];
  let history = [];
  let upcoming = [];
  let preferences = { favorites: [], lastLaunched: {}, autoUpdates: {}, minimizeToTray: false, notifications: true };
  let autostart = { supported: false, enabled: false, showPrompt: false };
  let selfUpdate = { phase: 'idle', version: '', latestVersion: null, progress: null };
  let filter = 'all';
  let sort = 'default';
  let search = '';
  let detailId = null;
  let downloadLayout = '';
  let libraryLayout = '';

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const bytes = value => {
    if (!value) return '—';
    const unit = value >= 1024 ** 3 ? 'GB' : 'MB';
    return `${(value / (unit === 'GB' ? 1024 ** 3 : 1024 ** 2)).toFixed(1)} ${unit}`;
  };
  const duration = value => value == null || !Number.isFinite(value) ? '—' : value < 60
    ? `${Math.ceil(value)} s` : `${Math.ceil(value / 60)} min`;
  const date = value => {
    const stamp = new Date(value);
    return Number.isNaN(stamp.getTime()) ? '' : new Intl.DateTimeFormat(window.I18N.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(stamp);
  };
  const plainNotes = value => String(value || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/https?:\/\/\S+/g, '')
    .trim();
  const appName = id => id === 'cinderport' ? 'Cinderport' : apps.find(item => item.id === id)?.name || id;
  const isFavorite = id => preferences.favorites?.includes(id);
  const autoUpdateEnabled = id => preferences.autoUpdates?.[id] !== false;

  function errorText(item) {
    return item.errorCode ? t(`error.${item.errorCode}`, { detail: item.errorDetail }) : '';
  }

  function statusKey(item) {
    if (item.phase === 'checking' || item.phase === 'idle') return 'card.checking';
    if (['queued', 'waiting', 'downloading', 'installing', 'error', 'update'].includes(item.phase)) return `card.${item.phase}`;
    return item.installedVersion ? 'card.upToDate' : 'card.available';
  }

  function primaryAction(item) {
    if (item.phase === 'downloading') return { label: t('card.downloadProgress', { percent: item.progress ?? '…' }), command: '', disabled: true };
    if (item.phase === 'installing') return { label: t('card.installing'), command: '', disabled: true };
    if (item.phase === 'queued' || item.phase === 'waiting') return { label: t(statusKey(item)), command: '', disabled: true };
    if (item.installedVersion) return { label: t('action.launch'), command: 'launch', disabled: false };
    if (item.phase === 'error') return { label: t('action.retry'), command: 'retry', disabled: false };
    return { label: t('action.install'), command: 'install', disabled: ['checking', 'idle'].includes(item.phase) };
  }

  function card(item, index) {
    const primary = primaryAction(item);
    const working = ['queued', 'waiting', 'downloading', 'installing'].includes(item.phase);
    const secondary = item.installedVersion && item.phase === 'update'
      ? `<button class="small-action accent" data-command="install" data-id="${escape(item.id)}">${escape(t('action.update'))}</button>`
      : item.installedVersion && item.phase === 'error' && item.latestVersion
        ? `<button class="small-action accent" data-command="retry" data-id="${escape(item.id)}">${escape(t('action.retry'))}</button>`
        : item.installedVersion
          ? `<button class="small-action" data-command="folder" data-id="${escape(item.id)}">${escape(t('action.folder'))}</button>`
          : '';
    const version = item.installedVersion ? t('card.version', { version: item.installedVersion })
      : item.latestVersion ? t('card.latest', { version: item.latestVersion }) : t('card.noVersion');
    const progress = item.phase === 'downloading' || item.phase === 'installing'
      ? `<div class="progress-track"><span style="width:${item.phase === 'installing' ? 100 : 0}%"></span></div>`
      : '';
    return `<article class="app-card ${escape(item.theme)} ${working ? 'is-busy' : ''}" data-card-id="${escape(item.id)}">
      <div class="card-art"><img src="../assets/${escape(item.id)}-cover.png" alt="" draggable="false"><div class="art-index">${String(index + 1).padStart(2, '0')} / ${String(apps.length).padStart(2, '0')}</div><div class="art-corner"></div><button class="favorite-button ${isFavorite(item.id) ? 'active' : ''}" data-command="favorite" data-id="${escape(item.id)}" aria-label="${escape(t(isFavorite(item.id) ? 'favorite.remove' : 'favorite.add'))}" title="${escape(t(isFavorite(item.id) ? 'favorite.remove' : 'favorite.add'))}">★</button></div>
      <div class="card-content"><div class="card-category">${escape(item.eyebrow)}</div>
        <div class="card-title-row"><h4>${escape(item.name)}</h4><span class="status-badge ${escape(item.phase)}">${escape(t(statusKey(item)))}</span></div>
        <p>${escape(item.description?.[window.I18N.locale] || item.description?.en || '')}</p>
        <div class="card-version"><span class="pixel-bullet"></span>${escape(version)}</div>
        ${item.errorCode ? `<div class="card-error" role="alert">${escape(errorText(item))}</div>` : ''}${progress}
        <div class="card-actions"><button class="primary-action" data-command="${escape(primary.command)}" data-id="${escape(item.id)}" ${primary.disabled ? 'disabled' : ''}><span>${primary.command === 'launch' ? '▶' : primary.command === 'install' ? '↓' : '↻'}</span>${escape(primary.label)}</button>${secondary}</div>
        <div class="card-links"><button data-command="detail" data-id="${escape(item.id)}">${escape(t('action.details'))} →</button><button data-command="releases" data-id="${escape(item.id)}">${escape(t('action.releases'))} ↗</button>${item.itch ? `<button data-command="itch" data-id="${escape(item.id)}">itch.io ↗</button>` : ''}</div>
      </div></article>`;
  }

  function visibleApps() {
    const query = search.trim().toLocaleLowerCase(window.I18N.locale);
    const list = apps.filter(item => {
      if (filter === 'installed' && !item.installedVersion) return false;
      if (filter === 'update' && !['update', 'queued', 'waiting', 'downloading', 'installing'].includes(item.phase)) return false;
      if (filter === 'favorite' && !isFavorite(item.id)) return false;
      return !query || `${item.name} ${item.eyebrow} ${item.description?.[window.I18N.locale] || ''}`.toLocaleLowerCase(window.I18N.locale).includes(query);
    });
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, window.I18N.locale));
    else if (sort === 'recent') list.sort((a, b) => (preferences.lastLaunched?.[b.id] || 0) - (preferences.lastLaunched?.[a.id] || 0));
    else list.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)));
    return list;
  }

  function renderLibrary() {
    document.getElementById('app-count').textContent = String(apps.length).padStart(2, '0');
    const visible = visibleApps();
    const layout = JSON.stringify([window.I18N.locale, filter, sort, search, preferences.favorites,
      visible.map(item => [item.id, item.phase, item.installedVersion, item.latestVersion, item.errorCode, item.errorDetail])]);
    if (layout !== libraryLayout) {
      libraryLayout = layout;
      document.getElementById('app-cards').innerHTML = visible.map((item, index) => card(item, index)).join('');
    }
    for (const item of visible.filter(entry => entry.phase === 'downloading')) {
      const element = [...document.querySelectorAll('[data-card-id]')].find(card => card.dataset.cardId === item.id);
      if (!element) continue;
      const fill = element.querySelector('.progress-track span');
      const label = element.querySelector('.primary-action').lastChild;
      if (label.nodeType === Node.TEXT_NODE) label.nodeValue = primaryAction(item).label;
      const value = Math.max(0, Math.min(100, item.progress ?? 0));
      requestAnimationFrame(() => { if (fill.isConnected) fill.style.width = `${value}%`; });
    }
    document.getElementById('library-empty').hidden = visible.length > 0;
    document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
    const last = apps.filter(item => item.installedVersion && preferences.lastLaunched?.[item.id])
      .sort((a, b) => preferences.lastLaunched[b.id] - preferences.lastLaunched[a.id])[0];
    const quick = document.getElementById('quick-launch');
    quick.hidden = !last;
    if (last) {
      quick.dataset.id = last.id;
      quick.textContent = `▶ ${t('hero.quickLaunch', { name: last.name })}`;
    }
    document.getElementById('upcoming-grid').innerHTML = upcoming.length
      ? upcoming.map(item => `<article class="upcoming-card"><span>✦</span><div><div class="kicker">${escape(t('upcoming.soon'))}</div><h4>${escape(item.name)}</h4><p>${escape(item.description?.[window.I18N.locale] || item.description?.en || '')}</p></div></article>`).join('')
      : `<article class="upcoming-card"><span>✦</span><div><div class="kicker">${escape(t('upcoming.soon'))}</div><h4>${escape(t('upcoming.unknownTitle'))}</h4><p>${escape(t('upcoming.unknownText'))}</p></div></article>`;
  }

  function renderDownloads() {
    const jobs = apps.filter(item => ['queued', 'waiting', 'checking', 'downloading', 'installing', 'error'].includes(item.phase));
    const active = jobs.filter(item => ['queued', 'waiting', 'downloading', 'installing'].includes(item.phase)).length;
    document.getElementById('download-summary-text').textContent = t(active ? 'downloads.active' : 'downloads.none', { count: active });
    document.getElementById('downloads-empty').hidden = jobs.length > 0;
    const layout = `${window.I18N.locale}|${jobs.map(item => `${item.id}:${item.phase}:${item.queuePosition}:${item.errorCode}:${item.errorDetail}`).join('|')}`;
    if (layout !== downloadLayout) {
      downloadLayout = layout;
      document.getElementById('download-list').innerHTML = jobs.map(item => {
      const transfer = item.phase === 'downloading' ? `<div class="download-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="${escape(item.name)}"><span></span></div><div class="download-metrics"><span data-metric="bytes"></span><span data-metric="speed"></span><span data-metric="eta"></span></div>` : '';
      const detail = item.phase === 'queued' ? t('downloads.queuePosition', { number: item.queuePosition || 1 })
        : item.phase === 'waiting' ? t('downloads.waiting')
          : item.phase === 'installing' ? t('downloads.installing')
            : item.phase === 'error' ? errorText(item) : '';
      const cancel = ['queued', 'waiting', 'checking', 'downloading'].includes(item.phase)
        ? `<button class="outline-button" data-command="cancel" data-id="${escape(item.id)}">${escape(t('action.cancel'))}</button>` : '';
      const retry = item.phase === 'error' ? `<button class="outline-button" data-command="retry" data-id="${escape(item.id)}">${escape(t('action.retry'))}</button>` : '';
      return `<article class="download-item" data-download-id="${escape(item.id)}"><img src="../assets/${escape(item.id)}-cover.png" alt=""><div class="download-copy"><div class="download-title"><strong>${escape(item.name)}</strong><span class="status-badge ${escape(item.phase)}">${escape(t(statusKey(item)))}</span></div><p>${escape(detail)}</p>${transfer}</div><div class="download-actions">${cancel}${retry}</div></article>`;
      }).join('');
    }
    for (const item of jobs.filter(entry => entry.phase === 'downloading')) {
      const row = [...document.querySelectorAll('[data-download-id]')].find(element => element.dataset.downloadId === item.id);
      if (!row) continue;
      const meter = row.querySelector('.download-meter');
      const value = Math.max(0, Math.min(100, item.progress ?? 0));
      meter.setAttribute('aria-valuenow', String(value));
      row.querySelector('[data-metric="bytes"]').textContent = `${item.downloadedBytes ? bytes(item.downloadedBytes) : '0 MB'} / ${bytes(item.totalBytes)}`;
      row.querySelector('[data-metric="speed"]').textContent = `${bytes(item.speed)}/s`;
      row.querySelector('[data-metric="eta"]').textContent = t('downloads.remaining', { time: duration(item.eta) });
      requestAnimationFrame(() => { if (meter.isConnected) meter.querySelector('span').style.width = `${value}%`; });
    }
  }

  function renderActivity() {
    document.getElementById('activity-list').innerHTML = apps.map(item => `<div class="activity-row">
      <span class="activity-name"><i class="activity-icon ${escape(item.theme)}"></i>${escape(item.name)}</span>
      <span>${escape(item.installedVersion || '—')}</span><span>${escape(item.latestVersion || '—')}</span>
      <span class="activity-state ${escape(item.phase)}">${escape(t(statusKey(item)))}</span>
    </div>`).join('');
    document.getElementById('history-list').innerHTML = history.length ? history.map(entry => {
      const label = t(`history.${entry.kind}`, { name: appName(entry.id), version: entry.version });
      return `<div class="history-row"><span class="history-glyph">${entry.kind.includes('error') ? '!' : entry.kind === 'launched' ? '▶' : '✦'}</span><div><strong>${escape(label)}</strong>${entry.detail ? `<small>${escape(entry.detail)}</small>` : ''}</div><time>${escape(date(entry.at))}</time></div>`;
    }).join('') : `<div class="history-empty">${escape(t('activity.noHistory'))}</div>`;
  }

  function renderNews() {
    const releases = apps.filter(item => item.releasePage && item.latestVersion);
    document.getElementById('news-list').innerHTML = releases.length ? releases.map(item => `<article class="news-card ${escape(item.theme)}"><img src="../assets/${escape(item.id)}-cover.png" alt=""><div><div class="kicker">${escape(item.eyebrow)}</div><h2>${escape(item.name)} <span>${escape(item.latestVersion)}</span></h2><p>${escape((plainNotes(item.releaseNotes) || t('news.releaseAvailable')).slice(0, 650))}</p><button class="outline-button" data-command="releases" data-id="${escape(item.id)}">${escape(t('news.readMore'))} ↗</button></div></article>`).join('')
      : `<div class="empty-state"><span>✦</span><strong>${escape(t('news.emptyTitle'))}</strong><p>${escape(t('news.emptyText'))}</p></div>`;
  }

  function renderSummary() {
    const checking = apps.some(item => ['checking', 'idle'].includes(item.phase));
    const working = apps.some(item => ['queued', 'waiting', 'downloading', 'installing'].includes(item.phase));
    const errors = apps.some(item => item.phase === 'error');
    const updates = apps.filter(item => item.phase === 'update').length;
    const status = working ? 'status.work' : checking ? 'status.checking' : errors ? 'status.error' : updates ? 'status.update' : 'status.ready';
    const radar = working ? t('radar.processing') : updates ? t(updates === 1 ? 'radar.availableOne' : 'radar.availableMany', { count: updates }) : checking ? t('radar.checking') : errors ? t('radar.error') : t('radar.ready');
    document.getElementById('section-status').textContent = t(status);
    document.getElementById('radar-text').textContent = radar;
    const transfer = apps.find(item => item.phase === 'downloading');
    const signal = document.querySelector('.signal-meter');
    signal.hidden = !transfer && !checking;
    signal.classList.toggle('is-scanning', !transfer && checking);
    document.getElementById('signal-fill').style.width = transfer ? `${Math.max(0, Math.min(100, transfer.progress ?? 0))}%` : '35%';
    document.getElementById('activity-dot').classList.toggle('visible', working || errors);
    document.getElementById('downloads-dot').classList.toggle('visible', working);
    document.getElementById('refresh-button').classList.toggle('is-spinning', checking || working);
  }

  function toggle(button, enabled) {
    button.classList.toggle('on', Boolean(enabled));
    button.setAttribute('aria-checked', String(Boolean(enabled)));
  }

  function renderSettings() {
    toggle(document.getElementById('autostart-toggle'), autostart.enabled);
    document.getElementById('autostart-toggle').disabled = !autostart.supported;
    document.getElementById('autostart-hint').textContent = t(autostart.supported ? (autostart.enabled ? 'settings.enabled' : 'settings.disabled') : 'settings.unavailable');
    document.getElementById('autostart-modal').hidden = !autostart.showPrompt;
    toggle(document.getElementById('tray-toggle'), preferences.minimizeToTray);
    toggle(document.getElementById('notifications-toggle'), preferences.notifications);
    toggle(document.getElementById('dnd-toggle'), preferences.doNotDisturb);
    toggle(document.getElementById('compact-toggle'), preferences.compactView);
    toggle(document.getElementById('motion-toggle'), preferences.reduceMotion);
    document.body.dataset.theme = preferences.theme || 'cinder';
    document.body.classList.toggle('compact', Boolean(preferences.compactView));
    document.body.classList.toggle('reduce-motion', Boolean(preferences.reduceMotion));
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.classList.toggle('active', button.dataset.themeChoice === preferences.theme));
    document.querySelectorAll('[data-channel-choice]').forEach(button => button.classList.toggle('active', button.dataset.channelChoice === preferences.channel));
    document.getElementById('app-update-settings').innerHTML = apps.map(item => `<div class="app-update-row"><div><strong>${escape(item.name)}</strong><small>${escape(t(autoUpdateEnabled(item.id) ? 'settings.autoOn' : 'settings.autoOff'))}</small></div><button class="toggle ${autoUpdateEnabled(item.id) ? 'on' : ''}" role="switch" aria-checked="${autoUpdateEnabled(item.id)}" data-command="auto-update" data-id="${escape(item.id)}" aria-label="${escape(t('settings.appToggleAria', { name: item.name }))}"><span></span></button></div>`).join('');
    document.getElementById('sidebar-version').textContent = `V ${selfUpdate.version}`;
    document.getElementById('about-version').textContent = `VERSION ${selfUpdate.version} / WINDOWS`;
    document.getElementById('self-update-hint').textContent = t(`self.${selfUpdate.phase}`, { version: selfUpdate.latestVersion || '', progress: selfUpdate.progress ?? 0 });
    const updateAction = document.getElementById('self-update-action');
    updateAction.hidden = !['downloaded', 'error', 'ready'].includes(selfUpdate.phase);
    updateAction.textContent = t(selfUpdate.phase === 'downloaded' ? 'self.restart' : 'self.check');
    document.getElementById('updater-current').textContent = selfUpdate.version || '—';
    document.getElementById('updater-latest').textContent = selfUpdate.latestVersion || '—';
    document.getElementById('updater-phase').textContent = t(`updater.phase.${selfUpdate.phase}`);
    document.getElementById('updater-progress-fill').style.width = `${selfUpdate.phase === 'downloaded' ? 100 : selfUpdate.progress || 0}%`;
    document.getElementById('updater-error').textContent = selfUpdate.error || '';
    if (!document.activeElement?.matches('.launch-args-input')) {
      document.getElementById('launch-args-list').innerHTML = apps.map(item => `<div class="launch-args-row"><label for="args-${escape(item.id)}">${escape(item.name)}</label><input class="launch-args-input" id="args-${escape(item.id)}" data-id="${escape(item.id)}" value="${escape(preferences.launchArgs?.[item.id] || '')}" placeholder="${escape(t('settings.launchArgsPlaceholder'))}"><button class="outline-button" data-command="save-args" data-id="${escape(item.id)}">${escape(t('settings.saveArgs'))}</button></div>`).join('');
    }
  }

  function renderDetail() {
    const backdrop = document.getElementById('detail-backdrop');
    const item = apps.find(app => app.id === detailId);
    backdrop.hidden = !item;
    if (!item) return;
    const shots = item.screenshots?.length ? item.screenshots : [];
    const gallery = shots.map((name, index) => `<img src="../assets/${escape(name)}" alt="${escape(t('detail.screenshot', { number: index + 1, name: item.name }))}">`).join('');
    document.getElementById('detail-content').innerHTML = `<div class="detail-hero ${escape(item.theme)}"><img src="../assets/${escape(item.id)}-cover.png" alt=""><div><div class="kicker">${escape(item.eyebrow)}</div><h2 id="detail-title">${escape(item.name)}</h2><p>${escape(item.description?.[window.I18N.locale] || item.description?.en || '')}</p><span class="status-badge ${escape(item.phase)}">${escape(t(statusKey(item)))}</span></div></div>
      <div class="detail-stats"><div><span>${escape(t('detail.installed'))}</span><strong>${escape(item.installedVersion || '—')}</strong></div><div><span>${escape(t('detail.latest'))}</span><strong>${escape(item.latestVersion || '—')}</strong></div><div><span>${escape(t('detail.size'))}</span><strong>${escape(bytes(item.downloadSize))}</strong></div></div>
      <div class="detail-actions"><button class="primary-action" data-command="${item.installedVersion ? 'launch' : 'install'}" data-id="${escape(item.id)}">${escape(t(item.installedVersion ? 'action.launch' : 'action.install'))}</button>${item.phase === 'update' ? `<button class="outline-button" data-command="install" data-id="${escape(item.id)}">${escape(t('action.update'))}</button>` : ''}${item.installedVersion ? `<button class="outline-button" data-command="repair" data-id="${escape(item.id)}">${escape(t('action.repair'))}</button>` : `<button class="outline-button" data-command="import-app" data-id="${escape(item.id)}">${escape(t('action.importApp'))}</button>`}<button class="outline-button" data-command="releases" data-id="${escape(item.id)}">${escape(t('action.releases'))} ↗</button>${item.itch ? `<button class="outline-button" data-command="itch" data-id="${escape(item.id)}">itch.io ↗</button>` : ''}</div>
      ${gallery ? `<h3>${escape(t('detail.gallery'))}</h3><div class="detail-gallery">${gallery}</div>` : ''}
      <h3>${escape(t('detail.releaseNotes'))}</h3><div class="detail-notes">${escape(plainNotes(item.releaseNotes) || t('detail.noNotes'))}</div>`;
  }

  function render() {
    renderLibrary();
    renderDownloads();
    renderActivity();
    renderNews();
    renderSummary();
    renderSettings();
    renderDetail();
  }

  function showView(name) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === name));
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
    document.getElementById('main-content').scrollTop = 0;
    if (name === 'diagnostics') void window.cinderport.diagnostics().then(report => { document.getElementById('diagnostics-report').textContent = report; });
  }

  async function perform(command, id) {
    try {
      if (['install', 'retry', 'repair'].includes(command)) await window.cinderport.install(id);
      if (command === 'cancel') await window.cinderport.cancel(id);
      if (command === 'import-app') await window.cinderport.importApp(id);
      if (command === 'launch') await window.cinderport.launch(id);
      if (command === 'folder') await window.cinderport.showFile(id);
      if (command === 'releases') await window.cinderport.openPage(id, 'releases');
      if (command === 'itch') await window.cinderport.openPage(id, 'itch');
      if (command === 'refresh') await window.cinderport.refresh();
      if (command === 'favorite') preferences = await window.cinderport.setFavorite(id, !isFavorite(id));
      if (command === 'auto-update') preferences = await window.cinderport.setAppAutoUpdate(id, !autoUpdateEnabled(id));
      if (command === 'save-args') {
        const input = document.getElementById(`args-${id}`);
        preferences = await window.cinderport.setLaunchArgs(id, input.value);
        document.getElementById('settings-feedback').textContent = t('settings.saved');
      }
      if (command === 'detail') detailId = id;
      render();
    } catch (error) {
      const item = apps.find(app => app.id === id);
      if (item) {
        item.errorCode = 'unknown';
        item.errorDetail = error.message;
        item.phase = 'error';
        render();
      }
    }
  }

  async function setAutostart(enabled) {
    try {
      autostart = await window.cinderport.setAutostart(enabled);
      render();
    } catch {
      document.getElementById('autostart-hint').textContent = t('settings.changeError');
      showView('settings');
    }
  }

  async function setPreference(key, enabled) {
    try { preferences = await window.cinderport.setPreference(key, enabled); render(); }
    catch { showView('settings'); }
  }

  async function setChoice(key, value) {
    try { preferences = await window.cinderport.setChoice(key, value); render(); }
    catch { document.getElementById('settings-feedback').textContent = t('settings.changeError'); }
  }

  document.addEventListener('click', event => {
    const windowButton = event.target.closest('.window-button');
    if (windowButton) return window.cinderport.windowAction(windowButton.id);
    if (event.target.closest('#prompt-enable')) return setAutostart(true);
    if (event.target.closest('#prompt-later')) {
      window.cinderport.dismissAutostart().then(state => { autostart = state; render(); });
      return;
    }
    if (event.target.closest('#autostart-toggle')) return setAutostart(!autostart.enabled);
    if (event.target.closest('#tray-toggle')) return setPreference('minimizeToTray', !preferences.minimizeToTray);
    if (event.target.closest('#notifications-toggle')) return setPreference('notifications', !preferences.notifications);
    if (event.target.closest('#dnd-toggle')) return setPreference('doNotDisturb', !preferences.doNotDisturb);
    if (event.target.closest('#compact-toggle')) return setPreference('compactView', !preferences.compactView);
    if (event.target.closest('#motion-toggle')) return setPreference('reduceMotion', !preferences.reduceMotion);
    if (event.target.closest('#cleanup-cache')) return window.cinderport.cleanupCache().then(result => { document.getElementById('cache-result').textContent = t('downloads.cleaned', { count: result.removed, size: bytes(result.bytesFreed) }); });
    if (event.target.closest('#export-settings')) return window.cinderport.exportSettings().then(saved => { if (saved) document.getElementById('settings-feedback').textContent = t('settings.exported'); });
    if (event.target.closest('#import-settings')) return window.cinderport.importSettings().then(state => { if (state) { preferences = state; render(); document.getElementById('settings-feedback').textContent = t('settings.imported'); } }).catch(() => { document.getElementById('settings-feedback').textContent = t('settings.importError'); });
    if (event.target.closest('#open-diagnostics')) return showView('diagnostics');
    if (event.target.closest('#copy-diagnostics')) return window.cinderport.copyDiagnostics().then(() => { document.getElementById('copy-diagnostics').textContent = t('diagnostics.copied'); });
    if (event.target.closest('#self-update-action')) return selfUpdate.phase === 'downloaded' ? window.cinderport.restartForUpdate() : window.cinderport.checkUpdate();
    if (event.target.closest('#quick-launch')) return perform('launch', event.target.closest('#quick-launch').dataset.id);
    if (event.target.closest('#detail-close, #detail-backdrop') && (event.target.id === 'detail-backdrop' || event.target.closest('#detail-close'))) { detailId = null; renderDetail(); return; }
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) { filter = filterButton.dataset.filter; renderLibrary(); return; }
    const language = event.target.closest('[data-lang]');
    if (language) return window.I18N.setLocale(language.dataset.lang);
    const theme = event.target.closest('[data-theme-choice]');
    if (theme) return setChoice('theme', theme.dataset.themeChoice);
    const channel = event.target.closest('[data-channel-choice]');
    if (channel) return setChoice('channel', channel.dataset.channelChoice);
    const nav = event.target.closest('[data-view]');
    if (nav) return showView(nav.dataset.view);
    const command = event.target.closest('[data-command]');
    if (command && !command.disabled) return perform(command.dataset.command, command.dataset.id);
    if (event.target.closest('#refresh-button, #about-refresh')) return perform('refresh');
  });
  document.getElementById('app-search').addEventListener('input', event => { search = event.target.value; renderLibrary(); });
  document.getElementById('app-sort').addEventListener('change', event => { sort = event.target.value; renderLibrary(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && detailId) { detailId = null; renderDetail(); } });
  window.addEventListener('cinderport-language-changed', () => { window.cinderport.setUiLocale(window.I18N.locale); render(); });
  window.cinderport.onState(state => { apps = state; render(); });
  window.cinderport.onActivity(state => { history = state; renderActivity(); });
  window.cinderport.onPreferences(state => { preferences = state; render(); });
  window.cinderport.onUpdateState(state => { selfUpdate = state; render(); });
  window.cinderport.onWindowState(maximized => {
    const button = document.getElementById('maximize');
    button.title = t(maximized ? 'window.restore' : 'window.maximize');
    button.setAttribute('aria-label', button.title);
    button.classList.toggle('maximized', maximized);
  });

  (async () => {
    await window.I18N.initialize();
    window.cinderport.setUiLocale(window.I18N.locale);
    [autostart, selfUpdate, apps, preferences, history, upcoming] = await Promise.all([
      window.cinderport.autostartState(), window.cinderport.updateState(), window.cinderport.state(),
      window.cinderport.preferences(), window.cinderport.activity(), window.cinderport.upcoming()
    ]);
    render();
    await window.cinderport.refresh();
  })();
})();
