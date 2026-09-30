!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "$(CINDER_WELCOME_TITLE)"
  !define MUI_WELCOMEPAGE_TEXT "$(CINDER_WELCOME_TEXT)"
  !insertmacro MUI_PAGE_WELCOME
!macroend

LangString CINDER_WELCOME_TITLE 1031 "Willkommen bei Cinderport"
LangString CINDER_WELCOME_TITLE 1033 "Welcome to Cinderport"
LangString CINDER_WELCOME_TEXT 1031 "Deine Welten. Ein Portal.$\r$\n$\r$\nDieser Assistent installiert Cinderport, den Pixel-Art-Launcher für Embercrown, Kollaps und Streamplan Maker.$\r$\n$\r$\nAutostart bleibt aus, bis du ihn beim ersten Start selbst aktivierst."
LangString CINDER_WELCOME_TEXT 1033 "Your worlds. One portal.$\r$\n$\r$\nThis wizard installs Cinderport, the pixel-art launcher for Embercrown, Kollaps, and Streamplan Maker.$\r$\n$\r$\nStartup stays off until you choose to enable it on first launch."
