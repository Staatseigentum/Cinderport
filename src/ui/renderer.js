(() => {
  const { t } = window.I18N;
  let apps = [];
  let autostart = { supported: false, enabled: false, showPrompt: false };
  let selfUpdate = { phase: 'idle', version: '', latestVersion: null, progress: null };

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function errorText(item) {
    return item.errorCode ? t(`error.${item.errorCode}`, { detail: item.errorDetail }) : '';
  }

  function statusKey(item) {
    if (item.phase === 'checking' || item.phase === 'idle') return 'card.checking';
    if (item.phase === 'downloading') return 'card.downloading';
    if (item.phase === 'installing') return 'card.installing';
    if (item.phase === 'error') return 'card.error';
    if (item.phase === 'update') return 'card.update';
    return item.installedVersion ? 'card.upToDate' : 'card.available';
  }

  function action(item) {
    const busy = ['checking', 'downloading', 'installing', 'idle'].includes(item.phase);
    if (item.phase === 'downloading') return { label: t('card.downloadProgress', { percent: item.progress ?? '…' }), command: '', disabled: true };
    if (item.phase === 'installing') return { label: t('card.installing'), command: '', disabled: true };
    if (item.phase === 'error' && !item.installedVersion) return { label: t('action.retry'), command: 'refresh', disabled: false };
    if (item.installedVersion) return { label: t('action.launch'), command: 'launch', disabled: false };
    return { label: t('action.install'), command: 'install', disabled: busy };
  }

  function card(item, index) {
    const primary = action(item);
    const installing = item.phase === 'downloading' || item.phase === 'installing';
    const secondary = item.installedVersion && item.phase === 'update'
      ? `<button class="small-action accent" data-command="install" data-id="${escape(item.id)}">${escape(t('action.update'))}</button>`
      : item.installedVersion
        ? `<button class="small-action" data-command="folder" data-id="${escape(item.id)}">${escape(t('action.folder'))}</button>`
        : '';
    const version = item.installedVersion
      ? t('card.version', { version: item.installedVersion })
      : item.latestVersion ? t('card.latest', { version: item.latestVersion }) : t('card.noVersion');
    const progress = installing
      ? `<div class="progress-track"><span style="width:${item.phase === 'installing' ? '100' : Math.max(2, item.progress ?? 5)}%"></span></div>`
      : '';
    return `<article class="app-card ${escape(item.theme)} ${installing ? 'is-busy' : ''}">
      <div class="card-art"><img src="../assets/${escape(item.id)}-cover.png" alt="" draggable="false"><div class="art-index">${String(index + 1).padStart(2, '0')} / ${String(apps.length).padStart(2, '0')}</div><div class="art-corner"></div></div>
      <div class="card-content">
        <div class="card-category">${escape(item.eyebrow)}</div>
        <div class="card-title-row"><h4>${escape(item.name)}</h4><span class="status-badge ${escape(item.phase)}">${escape(t(statusKey(item)))}</span></div>
        <p>${escape(item.description?.[window.I18N.locale] || item.description?.en || '')}</p>
        <div class="card-version"><span class="pixel-bullet"></span>${escape(version)}</div>
        ${item.errorCode ? `<div class="card-error" role="alert">${escape(errorText(item))}</div>` : ''}
        ${progress}
        <div class="card-actions"><button class="primary-action" data-command="${escape(primary.command)}" data-id="${escape(item.id)}" ${primary.disabled ? 'disabled' : ''}><span>${primary.command === 'launch' ? '▶' : primary.command === 'install' ? '↓' : '↻'}</span>${escape(primary.label)}</button>${secondary}</div>
        <div class="card-links"><button data-command="releases" data-id="${escape(item.id)}">${escape(t('action.releases'))} ↗</button>${item.itch ? `<button data-command="itch" data-id="${escape(item.id)}">${escape(t('action.itch'))} ↗</button>` : ''}</div>
      </div>
    </article>`;
  }

  function renderActivity() {
    document.getElementById('activity-list').innerHTML = apps.map(item => `<div class="activity-row">
      <span class="activity-name"><i class="activity-icon ${escape(item.theme)}"></i>${escape(item.name)}</span>
      <span>${escape(item.installedVersion || '—')}</span>
      <span>${escape(item.latestVersion || '—')}</span>
      <span class="activity-state ${escape(item.phase)}">${escape(t(statusKey(item)))}</span>
    </div>`).join('');
  }

  function renderSummary() {
    const checking = apps.some(item => ['checking', 'idle'].includes(item.phase));
    const working = apps.some(item => ['downloading', 'installing'].includes(item.phase));
    const errors = apps.some(item => item.phase === 'error');
    const updates = apps.filter(item => item.phase === 'update' || (item.installedVersion && ['downloading', 'installing'].includes(item.phase))).length;
    const status = working ? 'status.work' : checking ? 'status.checking' : errors ? 'status.error' : updates ? 'status.update' : 'status.ready';
    const radar = working ? t('radar.processing') : updates ? t(updates === 1 ? 'radar.availableOne' : 'radar.availableMany', { count: updates }) : checking ? t('radar.checking') : errors ? t('radar.error') : t('radar.ready');
    document.getElementById('section-status').textContent = t(status);
    document.getElementById('radar-text').textContent = radar;
    document.getElementById('signal-fill').style.width = working ? '65%' : checking ? '36%' : errors ? '20%' : '100%';
    document.getElementById('activity-dot').classList.toggle('visible', working || errors);
    document.getElementById('refresh-button').classList.toggle('is-spinning', checking || working);
  }

  function render() {
    document.getElementById('app-count').textContent = String(apps.length).padStart(2, '0');
    document.getElementById('app-cards').innerHTML = apps.map(card).join('');
    renderActivity();
    renderSummary();
    const toggle = document.getElementById('autostart-toggle');
    toggle.classList.toggle('on', autostart.enabled);
    toggle.setAttribute('aria-checked', String(autostart.enabled));
    toggle.disabled = !autostart.supported;
    document.getElementById('autostart-hint').textContent = t(autostart.supported ? (autostart.enabled ? 'settings.enabled' : 'settings.disabled') : 'settings.unavailable');
    document.getElementById('autostart-modal').hidden = !autostart.showPrompt;
    document.getElementById('sidebar-version').textContent = `V ${selfUpdate.version}`;
    document.getElementById('about-version').textContent = `VERSION ${selfUpdate.version} / WINDOWS`;
    document.getElementById('self-update-hint').textContent = t(`self.${selfUpdate.phase}`, { version: selfUpdate.latestVersion || '', progress: selfUpdate.progress ?? 0 });
    const updateAction = document.getElementById('self-update-action');
    updateAction.hidden = !['downloaded', 'error', 'ready'].includes(selfUpdate.phase);
    updateAction.textContent = t(selfUpdate.phase === 'downloaded' ? 'self.restart' : 'self.check');
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

  function showView(name) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === name));
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
    document.getElementById('main-content').scrollTop = 0;
  }

  async function perform(command, id) {
    try {
      if (command === 'install') await window.cinderport.install(id);
      if (command === 'launch') await window.cinderport.launch(id);
      if (command === 'folder') await window.cinderport.showFile(id);
      if (command === 'releases') await window.cinderport.openPage(id, 'releases');
      if (command === 'itch') await window.cinderport.openPage(id, 'itch');
      if (command === 'refresh') await window.cinderport.refresh();
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

  document.addEventListener('click', event => {
    const windowButton = event.target.closest('.window-button');
    if (windowButton) return window.cinderport.windowAction(windowButton.id);
    if (event.target.closest('#prompt-enable')) return setAutostart(true);
    if (event.target.closest('#prompt-later')) {
      window.cinderport.dismissAutostart().then(state => { autostart = state; render(); });
      return;
    }
    if (event.target.closest('#autostart-toggle')) return setAutostart(!autostart.enabled);
    if (event.target.closest('#self-update-action')) return selfUpdate.phase === 'downloaded' ? window.cinderport.restartForUpdate() : window.cinderport.checkUpdate();
    const language = event.target.closest('[data-lang]');
    if (language) return window.I18N.setLocale(language.dataset.lang);
    const nav = event.target.closest('[data-view]');
    if (nav) return showView(nav.dataset.view);
    const command = event.target.closest('[data-command]');
    if (command && !command.disabled) return perform(command.dataset.command, command.dataset.id);
    if (event.target.closest('#refresh-button, #about-refresh')) return perform('refresh');
  });

  window.addEventListener('cinderport-language-changed', render);
  window.cinderport.onState(state => { apps = state; render(); });
  window.cinderport.onUpdateState(state => { selfUpdate = state; render(); });
  window.cinderport.onWindowState(maximized => {
    const button = document.getElementById('maximize');
    button.title = t(maximized ? 'window.restore' : 'window.maximize');
    button.setAttribute('aria-label', button.title);
    button.classList.toggle('maximized', maximized);
  });

  (async () => {
    await window.I18N.initialize();
    autostart = await window.cinderport.autostartState();
    selfUpdate = await window.cinderport.updateState();
    apps = await window.cinderport.state();
    render();
    await window.cinderport.refresh();
  })();
})();
