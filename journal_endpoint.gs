// Point de collecte du journal utilisateur ExpLore - test Bellecour
// Reçoit un POST JSON { code, team, t0, app_version, user_agent, events: [ {t, type, data}, ... ] }
// et écrit une ligne par événement dans l'onglet "journal".
//
// Mise en service : voir la procédure du brief (Extensions → Apps Script,
// Déployer → Application web, exécuter en tant que Moi, accès Tout le monde).
// L'URL /exec obtenue va dans la constante JOURNAL_ENDPOINT de app/indextest.html.
// Après chaque modification de ce code : Gérer les déploiements → Nouvelle version.

const SHEET_NAME = 'journal';
const HEADER = ['recu_le', 'code', 'team', 't0', 'evenement_t', 'type', 'data', 'app_version', 'user_agent'];

function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const sheet = getSheet_();
    const events = Array.isArray(body.events) ? body.events : [];
    if (events.length === 0) return respond_('empty');

    const now = new Date();
    const rows = events.map(function (ev) {
      return [
        now,
        String(body.code || ''),
        body.team ? 'oui' : 'non',
        String(body.t0 || ''),
        String((ev && ev.t) || ''),
        String((ev && ev.type) || ''),
        JSON.stringify((ev && ev.data) || {}).slice(0, 5000),
        String(body.app_version || ''),
        String(body.user_agent || '').slice(0, 300)
      ];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
    return respond_('ok:' + rows.length);
  } catch (err) {
    return respond_('error:' + err.message);
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function respond_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
