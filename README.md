# Cinderport

Ein Windows-Launcher im Pixel-Art-Stil für die wachsende Sammlung von Staatseigentum. Aktuell enthält sie **Embercrown**, **Kollaps** und **Streamplan Maker**.

## Was er macht

- Erkennt bereits installierte Apps über Windows-Installationsdaten und die ausführbaren Dateien.
- Prüft beim Start die neuesten GitHub-Releases und installiert Updates vorhandener Apps automatisch.
- Installiert Apps direkt aus dem Launcher. Kollaps verwendet seinen MSI-Installer; Embercrown wird aus dem offiziellen Setup-Bundle als MSI installiert, damit ein eigener Installationsordner erhalten bleibt; Streamplan Maker verwendet seinen NSIS-Installer.
- Prüft auch Cinderport selbst beim Start auf neue GitHub-Releases. Neue Launcher-Versionen werden im Hintergrund geladen und beim Beenden installiert; alternativ kann sofort neu gestartet werden.
- Prüft jeden Download gegen den SHA-256-Wert des GitHub-Release-Assets, bevor ein Installer ausgeführt wird.
- Erkennt beim ersten Start die Windows-Sprache: Deutsch wird übernommen, alle anderen Sprachen verwenden Englisch. DE/EN lassen sich im Launcher umschalten.
- Bietet Autostart als freiwillige Einstellung. Beim ersten Start der installierten Anwendung wird gefragt; der Installer aktiviert Autostart nicht.
- Verwendet eine eigene Fensterleiste und fest eingebundene Cover. Die Cover für Embercrown und Kollaps stammen von den jeweiligen itch.io-Seiten. Das aktuelle Streamplan-Maker-Bild wurde direkt vom Entwickler bereitgestellt.

## Starten und bauen

Node.js 24 oder neuer wird für die Entwicklung benötigt.

```powershell
npm install
npm start
npm test
npm run dist:win
```

Der gebrandete Windows-Installer liegt danach unter `dist/Cinderport-Setup-<version>.exe`. Der Installer hat eine eigene Pixel-Art-Seitenfläche, einen Header und deutsche/englische Willkommenstexte. Die installierte App selbst hat eine vollständig eigene Fensterleiste.

## Cinderport veröffentlichen

`electron-builder` erzeugt neben dem NSIS-Installer auch `dist/latest.yml` und eine `.blockmap`. Diese drei Dateien gehören **gemeinsam** in ein öffentliches Release von [`Staatseigentum/Cinderport`](https://github.com/Staatseigentum/Cinderport/releases) mit dem Tag `v<version>`. Der Installer kann zusätzlich auf itch.io angeboten werden. Installierte Cinderport-Kopien lesen ihren Updatekanal direkt aus dem mitgelieferten `app-update.yml` und nutzen den NSIS-Updater. Vor jedem Release die Version in `package.json` erhöhen und neu bauen; `latest.yml` und Installer müssen aus demselben Build stammen. Der aktuelle Installer ist nicht mit einem eigenen Authenticode-Zertifikat signiert.

## Neue Apps hinzufügen

Ein neues App-Objekt in [`src/catalog.js`](src/catalog.js) hinzufügen: ID, Name, deutsche/englische Kurzbeschreibung, GitHub-Repository, Release-Asset-Muster, Installer-Typ, ausführbare Datei, Registry-Name und typische Installationsordner. Ein fest eingebautes Cover als `src/assets/<id>-cover.png` ergänzen. Die Bibliothek, Karten, Zähler, Statusansicht, Installationssuche und Updateprüfung verwenden den Katalog automatisch. Bei neuen Installer-Formaten den Ausführungspfad in `src/library.js` ergänzen. Der Release-Asset muss einen von GitHub veröffentlichten SHA-256-Digest besitzen.

Für eine Ansicht ohne automatische Installation vorhandener App-Updates kann der gepackte Launcher als Vorschau mit `CINDERPORT_PREVIEW=1` gestartet werden. Im normalen Start ist die Update-Automatik aktiv.

## Release-Quellen

| App | GitHub-Releases | Windows-Paket |
| --- | --- | --- |
| Embercrown | [Staatseigentum/Idle-game](https://github.com/Staatseigentum/Idle-game/releases) | `Embercrown-windows-Setup.exe` (enthält MSI) |
| Kollaps | [Staatseigentum/Boredom](https://github.com/Staatseigentum/Boredom/releases) | `Kollaps-<version>-setup.msi` |
| Streamplan Maker | [Staatseigentum/streamplan-maker](https://github.com/Staatseigentum/streamplan-maker/releases) | `Streamplan-Maker-Setup-<version>.exe` |

Die GitHub-API hat für anonyme Anfragen ein Limit. Bei einem Netzwerkfehler bleiben installierte Apps startbar; der Launcher zeigt den Fehler an und kann später erneut prüfen.

## Daten

Lokale Einstellungen und Installationsinformationen liegen im Electron-`userData`-Ordner. Cinderport speichert keine App-Spielstände. Die Installer der jeweiligen Apps verwalten ihre eigenen Dateien und Spielstände.

Das unter `vendor/wix` mitgelieferte WiX-Tool extrahiert ausschließlich das MSI aus dem verifizierten Embercrown-Release. Lizenz und Quellcodeverweis stehen im selben Verzeichnis.
