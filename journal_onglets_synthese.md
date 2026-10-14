# Journal du test Bellecour : onglets de synthèse

Formules à coller dans deux onglets du Sheet `ExpLore journal test Bellecour`.
Elles lisent l'onglet `journal` et repèrent les colonnes **par leur nom** (ligne 1) :
elles marchent avec l'en-tête neuf comme avec l'ancien en-tête complété à droite.
Rien d'autre à saisir : tout se recalcule seul.

**Séparateurs.** Les formules ci-dessous utilisent `;`, ce qui correspond à un Sheet
en paramètres régionaux France (Fichier → Paramètres). Si le Sheet est réglé sur
États-Unis ou Royaume-Uni, remplacer chaque `;` par `,`.

**Fuseau.** Le journal horodate en UTC. `decalage; 2/24` ramène à l'heure de Lyon
le 24 octobre (heure d'été, UTC+2). Après le 25 octobre, mettre `1/24`.

---

## Onglet `sessions` — cellule A1

Une ligne par session. Après le premier collage, sélectionner les colonnes E et F
puis Format → Nombre → Date et heure.

```
=LET(
  entete; journal!A1:Z1;
  donnees; journal!A2:Z;
  colonne; LAMBDA(nom; INDEX(donnees; 0; XMATCH(nom; entete)));
  sid; colonne("session_id");
  cod; colonne("code");
  tm; colonne("team");
  pf; colonne("plateforme");
  evt; colonne("evenement_t");
  typ; colonne("type");
  sect; colonne("section");
  car; colonne("carte");
  decalage; 2/24;
  versDate; LAMBDA(x; DATEVALUE(LEFT(x; 10)) + TIMEVALUE(MID(x; 12; 8)) + decalage);
  ids; UNIQUE(FILTER(sid; sid <> ""));
  ligne; LAMBDA(id; LET(
    ev; FILTER(evt; sid = id; evt <> "");
    deb; versDate(INDEX(SORT(ev); 1));
    fin; versDate(INDEX(SORT(ev; 1; 0); 1));
    HSTACK(
      id;
      XLOOKUP(id; sid; cod);
      XLOOKUP(id; sid; tm);
      XLOOKUP(id; sid; pf);
      deb;
      fin;
      ROUND((fin - deb) * 1440);
      IF(COUNTIFS(sid; id; typ; "tuto_step") = 0; ""; MAXIFS(sect; sid; id; typ; "tuto_step"));
      COUNTIFS(sid; id; typ; "nebula_crystallized");
      IFERROR(ROWS(UNIQUE(FILTER(car; sid = id; typ = "card_opened"; car <> ""))); 0);
      COUNTIFS(sid; id; typ; "journal_entry_unlocked");
      COUNTIFS(sid; id; typ; "resource_collected");
      COUNTIFS(sid; id; typ; "error");
      IF(COUNTIFS(sid; id; typ; "code_closed") > 0; "oui"; "non")
    )
  ));
  IFERROR(
    REDUCE(
      HSTACK("session_id"; "code"; "team"; "plateforme"; "début"; "fin"; "durée (min)";
             "dernière section atteinte"; "nébuleuses cristallisées"; "cartes ouvertes";
             "entrées carnet débloquées"; "ressources ramassées"; "erreurs"; "session clôturée");
      ids;
      LAMBDA(acc; id; VSTACK(acc; ligne(id)))
    );
    "Aucune session pour l'instant"
  )
)
```

Ce que comptent les colonnes :

| Colonne | Source dans `journal` |
|---|---|
| début / fin | premier et dernier `evenement_t` de la session |
| durée (min) | fin − début |
| dernière section atteinte | plus grande `section` des événements `tuto_step` |
| nébuleuses cristallisées | nombre de `nebula_crystallized` |
| cartes ouvertes | nombre de cartes **différentes** ouvertes (`card_opened`) |
| entrées carnet débloquées | nombre de `journal_entry_unlocked` |
| ressources ramassées | nombre de `resource_collected` (ressources du périmètre, ajouté avec ce brief) |
| erreurs | nombre de `error` |
| session clôturée | `oui` si le code a été ressaisi pour clore (`code_closed`) |

---

## Onglet `parcours` — cellule A1

Une ligne par session, une colonne par section (1 à 24) : la minute (depuis `t0`)
où la section a été atteinte pour la première fois. Case vide = section jamais
atteinte. Dernière ligne : moyenne par section, sans les vides et sans les sessions
`team = oui`.

```
=LET(
  entete; journal!A1:Z1;
  donnees; journal!A2:Z;
  colonne; LAMBDA(nom; INDEX(donnees; 0; XMATCH(nom; entete)));
  sid; colonne("session_id");
  tm; colonne("team");
  typ; colonne("type");
  sect; colonne("section");
  mn; colonne("minute");
  ids; UNIQUE(FILTER(sid; sid <> ""));
  equipes; MAP(ids; LAMBDA(id; XLOOKUP(id; sid; tm)));
  grille; MAKEARRAY(ROWS(ids); 24; LAMBDA(r; c; LET(id; INDEX(ids; r);
    IF(COUNTIFS(sid; id; typ; "tuto_step"; sect; c) = 0; "";
       MINIFS(mn; sid; id; typ; "tuto_step"; sect; c)))));
  moyennes; MAKEARRAY(1; 24; LAMBDA(r; c; LET(v; INDEX(grille; 0; c);
    IFERROR(ROUND(AVERAGE(FILTER(v; equipes = "non"; v <> "")); 1); ""))));
  IFERROR(
    VSTACK(
      HSTACK("session_id"; "team"; SEQUENCE(1; 24));
      HSTACK(ids; equipes; grille);
      HSTACK("moyenne hors équipe"; ""; moyennes)
    );
    "Aucune session pour l'instant"
  )
)
```

Lecture : un écart de dix minutes entre deux colonnes voisines, chez plusieurs
testeurs, désigne la section où ça bloque.

---

## Versions sur une seule ligne, séparateur virgule

À coller d'un bloc dans la barre de formule (pas dans la cellule) : un collage multiligne
répartit la formule sur plusieurs cellules. Version virgule = Sheet en paramètres
régionaux anglais (un Sheet qui affiche #ERROR! et non #ERREUR!).

### sessions, cellule A1

```
=LET(entete, journal!A1:Z1, donnees, journal!A2:Z, colonne, LAMBDA(nom, INDEX(donnees, 0, XMATCH(nom, entete))), sid, colonne("session_id"), cod, colonne("code"), tm, colonne("team"), pf, colonne("plateforme"), evt, colonne("evenement_t"), typ, colonne("type"), sect, colonne("section"), car, colonne("carte"), decalage, 2/24, versDate, LAMBDA(x, DATEVALUE(LEFT(x, 10)) + TIMEVALUE(MID(x, 12, 8)) + decalage), ids, UNIQUE(FILTER(sid, sid <> "")), ligne, LAMBDA(id, LET(ev, FILTER(evt, sid = id, evt <> ""), deb, versDate(INDEX(SORT(ev), 1)), fin, versDate(INDEX(SORT(ev, 1, 0), 1)), HSTACK(id, XLOOKUP(id, sid, cod), XLOOKUP(id, sid, tm), XLOOKUP(id, sid, pf), deb, fin, ROUND((fin - deb) * 1440), IF(COUNTIFS(sid, id, typ, "tuto_step") = 0, "", MAXIFS(sect, sid, id, typ, "tuto_step")), COUNTIFS(sid, id, typ, "nebula_crystallized"), IFERROR(ROWS(UNIQUE(FILTER(car, sid = id, typ = "card_opened", car <> ""))), 0), COUNTIFS(sid, id, typ, "journal_entry_unlocked"), COUNTIFS(sid, id, typ, "resource_collected"), COUNTIFS(sid, id, typ, "error"), IF(COUNTIFS(sid, id, typ, "code_closed") > 0, "oui", "non")))), IFERROR(REDUCE(HSTACK("session_id", "code", "team", "plateforme", "début", "fin", "durée (min)", "dernière section atteinte", "nébuleuses cristallisées", "cartes ouvertes", "entrées carnet débloquées", "ressources ramassées", "erreurs", "session clôturée"), ids, LAMBDA(acc, id, VSTACK(acc, ligne(id)))), "Aucune session pour l'instant"))
```

### parcours, cellule A1

```
=LET(entete, journal!A1:Z1, donnees, journal!A2:Z, colonne, LAMBDA(nom, INDEX(donnees, 0, XMATCH(nom, entete))), sid, colonne("session_id"), tm, colonne("team"), typ, colonne("type"), sect, colonne("section"), mn, colonne("minute"), ids, UNIQUE(FILTER(sid, sid <> "")), equipes, MAP(ids, LAMBDA(id, XLOOKUP(id, sid, tm))), grille, MAKEARRAY(ROWS(ids), 24, LAMBDA(r, c, LET(id, INDEX(ids, r), IF(COUNTIFS(sid, id, typ, "tuto_step", sect, c) = 0, "", MINIFS(mn, sid, id, typ, "tuto_step", sect, c))))), moyennes, MAKEARRAY(1, 24, LAMBDA(r, c, LET(v, INDEX(grille, 0, c), IFERROR(ROUND(AVERAGE(FILTER(v, equipes = "non", v <> "")), 1), "")))), IFERROR(VSTACK(HSTACK("session_id", "team", SEQUENCE(1, 24)), HSTACK(ids, equipes, grille), HSTACK("moyenne hors équipe", "", moyennes)), "Aucune session pour l'instant"))
```
