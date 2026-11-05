// Point de collecte du journal utilisateur ExpLore - test Bellecour
//
// ⚠ APRÈS TOUTE MODIFICATION DE CE CODE : Déployer → Gérer les déploiements →
//   icône crayon sur le déploiement existant → Version : Nouvelle version → Déployer.
//   Sans cette étape, l'URL /exec continue de servir l'ancien code.
//   L'URL ne change pas : rien à modifier dans app/test.html (JOURNAL_ENDPOINT).
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

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'check') return verifierCode_(p);
  return ContentService.createTextOutput('ok');
}

// ── Codes d'accès pilotés depuis le Sheet (brief sessions et codes, lot B) ──
// Onglet "codes" : code, etat (libre | utilise | desactive), session_id, t0, note.
// L'équipe ouvre ou ferme un code en changeant etat à la main : repasser un code
// à "libre" le réactive. Onglet créé vide (en-tête seul) s'il n'existe pas.
//
// Appel en JSONP (une balise <script> côté app, le fetch bute sur le cross-origin) :
//   GET /exec?action=check&code=XXX&session=YYY&callback=nom
// Réponse : nom({ ok: true })  ou  nom({ ok: false, raison: 'utilise' | 'desactive' | 'inconnu' | 'occupe' })
// Code accepté : etat passe à "utilise", session_id et t0 sont notés.
// Les codes équipe et invité ne sont jamais vérifiés ici (l'app ne les envoie pas).
const CODES_SHEET = 'codes';
const CODES_HEADER = ['code', 'etat', 'session_id', 't0', 'note'];

function verifierCode_(p) {
  const cb = String(p.callback || '');
  if (!/^[A-Za-z_$][\w$]{0,63}$/.test(cb)) return respond_('error:callback');
  const code = normaliser_(p.code);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return jsonp_(cb, { ok: false, raison: 'occupe' });
  }
  try {
    const sheet = codesSheet_();
    const cols = colonnes_(sheet);
    const n = sheet.getLastRow() - 1;
    if (!code || n < 1 || cols.code === undefined || cols.etat === undefined) {
      return jsonp_(cb, { ok: false, raison: 'inconnu' });
    }
    const valeurs = sheet.getRange(2, 1, n, sheet.getLastColumn()).getValues();
    for (let i = 0; i < n; i++) {
      if (normaliser_(valeurs[i][cols.code]) !== code) continue;
      // Accents et casse tolérés : « Utilisé », « désactivé ».
      const etat = String(valeurs[i][cols.etat] || '').trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (etat !== 'libre') return jsonp_(cb, { ok: false, raison: etat === 'desactive' ? 'desactive' : 'utilise' });
      const ligne = i + 2;
      sheet.getRange(ligne, cols.etat + 1).setValue('utilise');
      if (cols.session_id !== undefined) sheet.getRange(ligne, cols.session_id + 1).setValue(String(p.session || ''));
      if (cols.t0 !== undefined) sheet.getRange(ligne, cols.t0 + 1).setValue(new Date());
      return jsonp_(cb, { ok: true });
    }
    return jsonp_(cb, { ok: false, raison: 'inconnu' });
  } catch (err) {
    return jsonp_(cb, { ok: false, raison: 'occupe' });
  } finally {
    lock.releaseLock();
  }
}

function codesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CODES_SHEET);
  if (!sheet) sheet = ss.insertSheet(CODES_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CODES_HEADER.length).setValues([CODES_HEADER]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function normaliser_(s) {
  return String(s || '').toUpperCase().replace(/\s+/g, '');
}

function jsonp_(cb, obj) {
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
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
    // Journal GPS envoyé d'un clic par le testeur (Paramètres) : trop gros pour une
    // cellule, il part entier dans un fichier Drive ; une ligne le résume.
    if (body.kind === 'gps') return gps_(body);
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

// ── Journal GPS ─────────────────────────────────────────────
// Reçoit { kind: 'gps', session_id, code, team, plateforme, navigateur, app_version,
//          points, nom, journal } où journal est le JSON complet (jusqu'à ~2 Mo).
// Rangé dans l'onglet "gps" du Sheet, sans Drive (aucune autorisation de plus) :
// trop gros pour une cellule (50 000 caractères), il est découpé en morceaux de
// GPS_MORCEAU caractères, une ligne par morceau, numérotés « n / total ». Pour
// retrouver le fichier : recoller la colonne contenu des lignes d'un même
// session_id + nom, dans l'ordre des morceaux.
const GPS_SHEET = 'gps';
const GPS_MORCEAU = 45000;
const GPS_HEADER = ['recu_le', 'code', 'session_id', 'team', 'points', 'plateforme',
                    'navigateur', 'app_version', 'nom', 'morceau', 'nb_morceaux', 'contenu'];

function gps_(body) {
  const journal = typeof body.journal === 'string' ? body.journal : '';
  if (!journal) return respond_('empty');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GPS_SHEET);
  if (!sheet) sheet = ss.insertSheet(GPS_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, GPS_HEADER.length).setValues([GPS_HEADER]);
    sheet.setFrozenRows(1);
  }
  const total = Math.ceil(journal.length / GPS_MORCEAU);
  const now = new Date();
  const lignes = [];
  for (let i = 0; i < total; i++) {
    lignes.push([now, String(body.code || ''), String(body.session_id || ''),
      body.team ? 'oui' : 'non', Number(body.points) || '', String(body.plateforme || ''),
      String(body.navigateur || ''), String(body.app_version || ''), String(body.nom || ''),
      i + 1, total,
      journal.slice(i * GPS_MORCEAU, (i + 1) * GPS_MORCEAU)]);
  }
  const debut = sheet.getLastRow() + 1;
  // Colonne contenu en texte brut : sinon un morceau qui commence par un chiffre ou
  // un signe serait converti en nombre ou en formule, et le journal corrompu.
  sheet.getRange(debut, GPS_HEADER.length, lignes.length, 1).setNumberFormat('@');
  sheet.getRange(debut, 1, lignes.length, GPS_HEADER.length).setValues(lignes);
  return respond_('ok:gps:' + total);
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
