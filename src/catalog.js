// Add future apps here. Each entry owns its release, installer, discovery and cover metadata.
// Add a matching src/assets/<id>-cover.png (and optionally a theme in styles.css).
module.exports = [
  {
    id: 'embercrown',
    name: 'Embercrown',
    eyebrow: 'DARK FANTASY · IDLE',
    description: { de: 'Errichte ein Königreich im Dunkeln. Halte sein letztes Licht am Leben.', en: 'Build a kingdom in the dark. Keep its last light alive.' },
    github: 'Staatseigentum/Idle-game',
    itch: 'https://staatseigentum.itch.io/embercrown',
    asset: /^Embercrown-windows-Setup\.exe$/i,
    type: 'burn',
    executable: 'Embercrown.exe',
    registryName: 'Embercrown',
    installFolders: ['Embercrown'],
    theme: 'ember',
    screenshots: ['embercrown-shot-1.jpg', 'embercrown-shot-2.jpg']
  },
  {
    id: 'kollaps',
    name: 'Kollaps',
    eyebrow: 'SPACE · IDLE',
    description: { de: 'Vom Meteoriten zum Schwarzen Loch. Jede Masse zählt.', en: 'From meteoroid to black hole. Every bit of mass counts.' },
    github: 'Staatseigentum/Boredom',
    itch: 'https://staatseigentum.itch.io/kollaps',
    asset: /^Kollaps-[\d.]+-setup\.msi$/i,
    type: 'msi',
    executable: 'Kollaps.exe',
    registryName: 'Kollaps',
    installFolders: ['Kollaps'],
    theme: 'space',
    screenshots: ['kollaps-shot-4.png', 'kollaps-shot-5.png']
  },
  {
    id: 'streamplan',
    name: 'Streamplan Maker',
    eyebrow: 'CREATOR TOOL · DESIGN',
    description: { de: 'Baue deinen Streamplan und bring deine Woche in Form.', en: 'Build a streaming schedule and bring your week into shape.' },
    github: 'Staatseigentum/streamplan-maker',
    itch: null,
    asset: /^Streamplan-Maker-Setup-[\d.]+\.exe$/i,
    type: 'nsis',
    executable: 'Streamplan Maker.exe',
    registryName: 'Streamplan Maker',
    installFolders: ['streamplan-maker', 'Streamplan Maker'],
    theme: 'maker',
    screenshots: ['streamplan-preview.png']
  }
];
