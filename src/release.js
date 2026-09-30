const semver = require('semver');

class LauncherError extends Error {
  constructor(code, detail = '') {
    super(code);
    this.code = code;
    this.detail = String(detail);
  }
}

function asVersion(tag) {
  const version = semver.valid(tag) || semver.valid(semver.coerce(tag));
  if (!version) throw new LauncherError('invalid_version', tag);
  return version;
}

function isNewer(latest, installed) {
  return !installed || semver.gt(asVersion(latest), asVersion(installed));
}

async function latestRelease(app, fetchImpl = fetch) {
  const url = `https://api.github.com/repos/${app.github}/releases/latest`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Cinderport/0.1'
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw response.status === 403
      ? new LauncherError('rate_limit')
      : new LauncherError('release_http', response.status);
  }
  const release = await response.json();
  const asset = release.assets?.find(item => app.asset.test(item.name));
  if (!asset) throw new LauncherError('asset_missing');
  const digest = /^sha256:([a-f0-9]{64})$/i.exec(asset.digest || '');
  if (!digest) throw new LauncherError('digest_missing');
  const downloadUrl = new URL(asset.browser_download_url);
  if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'github.com') {
    throw new LauncherError('download_failed');
  }
  return {
    version: asVersion(release.tag_name),
    name: asset.name,
    url: downloadUrl.href,
    sha256: digest[1].toLowerCase(),
    size: asset.size,
    notes: (release.body || '').slice(0, 3000),
    page: release.html_url
  };
}

module.exports = { latestRelease, isNewer, asVersion, LauncherError };
