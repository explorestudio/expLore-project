// Point de collecte du journal utilisateur ExpLore - test Bellecour
//
// ⚠ APRÈS TOUTE MODIFICATION DE CE CODE : Déployer → Gérer les déploiements →
//   icône crayon sur le déploiement existant → Version : Nouvelle version → Déployer.
//   Sans cette étape, l'URL /exec continue de servir l'ancien code.
//   L'URL ne change pas : rien à modifier dans app/indextest.html (JOURNAL_ENDPOINT).
//
// Reçoit un POST JSON :
//   { session_id, code, team, t0, plateforme, navigateur, app_version, user_agent,
//     events: [ {t, type, data}, ... ] }
// et écrit une ligne par événement dans l'onglet "journal".
//
// Mise en service initiale : Extensions → Apps Script, coller ce fichier dans Code.gs,
// Déployer → Application web, exécuter en tant que Moi, accès Tout le monde.
//
// En-tête et anciennes lignes
// ---------------------------
// Les colonnes sont repérées par leur NOM dans la ligne 1, jamais par leur position.
// - Onglet vide : l'en-tête HEADER est posé tel quel.
// - Onglet qui ne contient QUE la ligne d'en-tête (aucune donnée, par exemple après
//   le nettoyage de la veille du test) : l'en-tête est remplacé par HEADER, dans
//   l'ordre voulu. Aucune ligne de données n'est touchée, puisqu'il n'y en a pas.
// - Onglet qui contient déjà des données avec un autre en-tête (ancien format) :
//   rien n'est réécrit. Les colonnes manquantes sont ajoutées à DROITE de l'en-tête
//   existant, et chaque nouvelle ligne est écrite sous les bons noms de colonne.
//   Les anciennes colonnes (data, user_agent) restent en place et vides pour les
//   nouvelles lignes ; les anciennes lignes ne sont pas migrées.
//
// Tolérance : un événement sans session_id, plateforme ou data s'écrit quand même,
// colonnes vides.

const SHEET_NAME = 'journal';
const HEADER = ['recu_le', 'session_id', 'code', 'team', 't0', 'evenement_t', 'minute', 'type',
                'section', 'carte', 'detail', 'plateforme', 'navigateur', 'app_version'];
const DETAIL_MAX = 500;

function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  // Verrou : vingt téléphones peuvent envoyer au même moment ; sans lui, deux envois
  // simultanés écriraient sur la même « dernière ligne ».
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return respond_('error:busy');
  }
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const events = Array.isArray(body.events) ? body.events : [];
    if (events.length === 0) return respond_('empty');

    const sheet = getSheet_();
    const cols = colonnes_(sheet);           // nom → index (0-based)
    const largeur = sheet.getLastColumn();
    const now = new Date();
    const t0ms = Date.parse(body.t0 || '');

    const rows = events.map(function (ev) {
      ev = ev || {};
      const data = (ev.data && typeof ev.data === 'object') ? ev.data : {};
      const evMs = Date.parse(ev.t || '');
      const reste = {};
      Object.keys(data).forEach(function (k) {
        if (k !== 'section' && k !== 'card' && k !== 'carte') reste[k] = data[k];
      });
      const carte = data.card !== undefined ? data.card : (data.carte !== undefined ? data.carte : '');
      const valeurs = {
        recu_le:     now,
        session_id:  String(body.session_id || ''),
        code:        String(body.code || ''),
        team:        body.team ? 'oui' : 'non',
        t0:          String(body.t0 || ''),
        evenement_t: String(ev.t || ''),
        minute:      (isNaN(t0ms) || isNaN(evMs)) ? '' : Math.round((evMs - t0ms) / 60000),
        type:        String(ev.type || ''),
        section:     data.section !== undefined ? data.section : '',
        carte:       String(carte),
        detail:      Object.keys(reste).length ? JSON.stringify(reste).slice(0, DETAIL_MAX) : '',
        plateforme:  String(body.plateforme || ''),
        navigateur:  String(body.navigateur || ''),
        app_version: String(body.app_version || '')
      };
      const ligne = new Array(largeur).fill('');
      Object.keys(valeurs).forEach(function (nom) {
        if (cols[nom] !== undefined) ligne[cols[nom]] = valeurs[nom];
      });
      return ligne;
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, largeur).setValues(rows);
    return respond_('ok:' + rows.length);
  } catch (err) {
    return respond_('error:' + err.message);
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const existant = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const identique = existant.length === HEADER.length && existant.every(function (n, i) { return n === HEADER[i]; });
  if (identique) return sheet;

  if (sheet.getLastRow() === 1) {
    // En-tête seul, aucune donnée : on pose le nouvel en-tête dans l'ordre voulu.
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).clearContent();
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Données présentes, ancien en-tête : colonnes manquantes ajoutées à droite.
  const manquantes = HEADER.filter(function (n) { return existant.indexOf(n) < 0; });
  if (manquantes.length) {
    sheet.getRange(1, existant.length + 1, 1, manquantes.length).setValues([manquantes]);
  }
  return sheet;
}

// Nom de colonne → index (0-based), d'après la ligne d'en-tête.
function colonnes_(sheet) {
  const noms = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const cols = {};
  noms.forEach(function (n, i) { if (n !== '' && cols[n] === undefined) cols[String(n)] = i; });
  return cols;
}

function respond_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
