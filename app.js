        /* ========================================
           JAVASCRIPT - HIER BEGINNT DIE LOGIK
           ======================================== */

        // ===== KONFIGURATION =====

        /* ################################################################
           PINs UND ABTEILUNGSNAMEN - HIER ÄNDERN
           ################################################################
           Jede Abteilung hat ZWEI vierstellige PINs:

             pin           = Anmeldung in die Abteilung (Startbildschirm)
             verwaltungsPin = Zugang zur Verwaltung dieser Abteilung
                              (Guthaben, Preise, Personen, Backup)

           Nur Ziffern 0-9, immer genau 4 Stellen, in Anführungszeichen.
           Nach einer Änderung die Datei auf GitHub ersetzen. Die gespeicherten
           Daten auf dem iPad bleiben dabei erhalten.
           ################################################################ */
        const ABTEILUNGEN = {
            a1: { name: "Abteilung 1", pin: "1111", verwaltungsPin: "1234" },
            a2: { name: "Abteilung 2", pin: "2222", verwaltungsPin: "2345" },
            a3: { name: "Abteilung 3", pin: "3333", verwaltungsPin: "3456" }
        };

        const WACHE_NAME = "Wache Nord";

        // Kategorien dieser Wache (Reihenfolge = Anzeige)
        const KATEGORIEN = {
            wachabteilung: "Wachabteilung",
            gaeste: "Gäste",
            azubi: "Auszubildende",
            tagesdienst: "Tagesdienst",
            leitstelle: "Leitstelle"
        };
        // Kategorien mit leeren Plätzen (Namen werden bei Bedarf eingegeben)
        const PLATZHALTER_KATEGORIEN = ['gaeste', 'azubi', 'tagesdienst', 'leitstelle'];
        const PLATZHALTER_ANZAHL = 12;

        // Vorsilbe für alle Einträge im Browser-Speicher
        const SPEICHER_PRAEFIX = "nord_";

        // Welche Abteilung ist gerade angemeldet? (z.B. "a1")
        let aktuelleAbteilung = null;

        /* ========================================
           DATEN-STRUKTUR
           
           Hier werden alle Daten der App gespeichert.
           Diese Daten werden im Browser (localStorage)
           gespeichert und bleiben auch nach einem
           Neustart der App erhalten.
           ======================================== */
        
        /* ----- PRODUKTE -----
           
           Alle verfügbaren Produkte, organisiert
           nach Kategorien (Getränke, Brötchen, etc.).
           
           STRUKTUR:
           - id: Einzigartige Nummer des Produkts
           - name: Name der auf der Karte angezeigt wird
           - preis: Preis in Euro (änderbar in Preisverwaltung)
           - typ: Kategorie für Einkaufsliste
                  (z.B. "brötchen_normal" wird gezählt,
                   "sonstiges" wird NICHT gezählt)
           
           NEUE PRODUKTE HINZUFÜGEN:
           1. Neue id vergeben (fortlaufend)
           2. Name, Preis und Typ festlegen
           3. In passende Kategorie einfügen
           
           NEUE KATEGORIE HINZUFÜGEN:
           1. Neues Objekt mit name + produkte erstellen
           2. In produktKategorien-Array einfügen
        */
        let produktKategorien = [
            {
                name: "Getränke",
                produkte: [
                    { id: 1, name: "Kaffeeflatrate", preis: 1.00, typ: "sonstiges" },
                    { id: 2, name: "Cola/Fanta/Limo", preis: 1.30, typ: "sonstiges" },
                    
                    
                ]
            },
            {
                name: "Brötchen",
                produkte: [
                    { id: 3, name: "Normal", preis: 1.30, typ: "brötchen_normal" },
                    { id: 4, name: "Sunny", preis: 1.50, typ: "brötchen_sunny" },
                    { id: 5, name: "Roggen", preis: 1.70, typ: "brötchen_roggen" },
                    { id: 6, name: "Mehrkorn", preis: 1.70, typ: "brötchen_mehrkorn" }
                    
                ]
            },
            {
                name: "Eier",
                produkte: [
                    { id: 7, name: "Ei", preis: 0.40, typ: "ei" }
                ]
            },
            {
                name: "Abendessen",
                produkte: [
                    { id: 8, name: "Abendessen Normal", preis: 0, typ: "abendessen_normal" },
                    { id: 9, name: "Abendessen Vegetarisch", preis: 0, typ: "abendessen_vegetarisch" }
                ]
            },
             
            {
                name: "Kuchen & Eis",
                produkte: [
                    { id: 10, name: "Kuchen/Eis", preis: 1.20, typ: "sonstiges" }
                ]
            },
            {
                name: "Sonstiges",
                produkte: [
                    { id: 11, name: "Süßes Klein", preis: 0.40, typ: "sonstiges" },
                    { id: 12, name: "Süßes Groß", preis: 0.80, typ: "sonstiges" }
                ]
            }
        ];

        // HILFSVARIABLE: Flache Produkt-Liste
        // Wird automatisch aus produktKategorien erstellt
        // Macht es einfacher, ein Produkt per ID zu finden
        let alleProdukteFlach = [];
        produktKategorien.forEach(kategorie => {
            alleProdukteFlach = alleProdukteFlach.concat(kategorie.produkte);
        });

        /* ----- BENUTZER -----

           Alle Personen, die die Kantine dieser Abteilung nutzen,
           organisiert nach 3 Kategorien.

           STRUKTUR JEDER PERSON:
           - id: Einzigartige ID (nur bei Wachabteilung, z.B. "w1")
           - name: Name der Person
           - guthaben: Aktuelles Guthaben in Euro (kann negativ sein = Schulden)
           - tagesbestellungen: Array mit heutigen Bestellungen
           - historie: Array mit den Buchungen der letzten 30 Tage
           - istPlatzhalter: true = Leerer Platz (nur bei Gästen/Azubi)

           KATEGORIEN:
           - wachabteilung: Starten LEER. Personen werden in der Verwaltung
                            unter "Wachabteilung bearbeiten" angelegt.
           - gaeste, azubi, tagesdienst, leitstelle: je 12 Platzhalter (Namen werden bei Bedarf eingegeben)
        */
        function neuePlatzhalter(anzahl) {
            const liste = [];
            for (let i = 0; i < anzahl; i++) {
                liste.push({ name: "", guthaben: 0.00, istPlatzhalter: true, tagesbestellungen: [], historie: [] });
            }
            return liste;
        }

        // Testpersonen: erscheinen NUR, wenn eine Abteilung noch gar keine gespeicherten Daten hat.
        // Zum Entfernen: Testpersonen in der Verwaltung löschen
        // (Wachabteilung: "Wachabteilung bearbeiten", Gäste/Azubi: "Person löschen").
        // Soll die App komplett leer starten: standardBenutzer(true) unten durch standardBenutzer() ersetzen.
        function standardBenutzer(mitTestpersonen) {
            const daten = {
                wachabteilung: [],
                gaeste: neuePlatzhalter(PLATZHALTER_ANZAHL),
                azubi: neuePlatzhalter(PLATZHALTER_ANZAHL),
                tagesdienst: neuePlatzhalter(PLATZHALTER_ANZAHL),
                leitstelle: neuePlatzhalter(PLATZHALTER_ANZAHL)
            };

            if (mitTestpersonen) {
                daten.wachabteilung.push({ id: "w1", name: "Test Wache", guthaben: 10.00, tagesbestellungen: [], historie: [] });
                daten.azubi[0] = { name: "Test Azubi", guthaben: 5.00, istPlatzhalter: false, tagesbestellungen: [], historie: [] };
                daten.gaeste[0] = { name: "Test Gast", guthaben: 5.00, istPlatzhalter: false, tagesbestellungen: [], historie: [] };
            }

            return daten;
        }

        let benutzer = standardBenutzer(true); // true = mit Testpersonen

        /* ----- EINKAUFSLISTE -----
           
           Zählt wie viele Artikel heute bestellt wurden.
           Diese Liste wird im Küchenbereich angezeigt.
           
           FUNKTION:
           - Bei jeder Bestellung werden die Mengen hochgezählt
           - Bei Tagesabschluss wird alles auf 0 gesetzt
           - Nur Produkte mit passendem "typ" werden gezählt
           
           NEUE ARTIKEL HINZUFÜGEN:
           1. Neue Zeile mit typ: 0 erstellen
           2. Typ muss mit Produkt-typ übereinstimmen
           3. Namen in einkaufslisteAnzeigen() hinzufügen
           
           HINWEIS: "sonstiges" wird NICHT gezählt!
        */
        let einkaufsliste = {
            brötchen_normal: 0,
            brötchen_mehrkorn: 0,
            brötchen_sunny: 0,
            brötchen_roggen: 0,
            ei: 0,
            abendessen_normal: 0,
            abendessen_vegetarisch: 0
        };

        /* ----- ABENDESSEN-BESTELLUNGEN -----
           
           Liste aller Personen die heute Abendessen bestellt haben.
           
           FUNKTION:
           - Beim Bestellen: Person wird zur Liste hinzugefügt (Preis = 0€)
           - Im Koch-Bereich: Liste wird angezeigt + Abrechnung möglich
           - Nach Abbuchung: Liste wird geleert
           
           STRUKTUR:
           - name: Name der Person
           - kategorie: Welche Kategorie (für Zugriff auf Guthaben)
           - benutzerIndex: Index in der Kategorie (für Guthaben-Abzug)
           - vegetarisch: true/false (zur Info, wird aber nicht unterschieden bei Abrechnung)
        */
        let abendessenBestellungen = [];

        /* ----- ZUSTANDSVARIABLEN -----
           
           Diese Variablen merken sich den aktuellen
           Zustand der App (wo ist der Benutzer gerade,
           was liegt im Warenkorb, etc.).
           
           Diese Variablen werden NICHT gespeichert,
           da sie sich ständig ändern.
        */
        let aktuelleKategorie = null;      // Welche Kategorie wurde gewählt? (wachabteilung/bdienst/etc.)
        let aktuellerBenutzer = null;      // Wer ist gerade angemeldet? (Objekt mit name, guthaben, etc.)
        let aktuellerGastIndex = null;     // Bei Gästen/Notarzt/Azubi: Welcher Platzhalter-Index?
        let warenkorb = [];                // Was liegt aktuell im Warenkorb? (Array von Produkten mit Menge)
        let guthabenVerwaltungKategorie = null; // Im Verwaltungsbereich: Welche Kategorie wurde gewählt?

        /* ========================================
           DATEN SPEICHERN & LADEN
           
           Diese Funktionen speichern alle wichtigen
           Daten im Browser (localStorage).
           
           localStorage = Speicher im Browser, der
           auch nach Neustart erhalten bleibt.
           
           WAS WIRD GESPEICHERT:
           - benutzer (mit Namen, Guthaben, Tagesbestellungen)
           - produktKategorien (mit Preisen)
           - einkaufsliste (Tageszähler)
           
           WAS WIRD NICHT GESPEICHERT:
           - Zustandsvariablen (aktuelleKategorie, warenkorb, etc.)
             Diese werden bei jedem App-Start zurückgesetzt
           ======================================== */
        
        // Speicher-Schlüssel MIT Abteilungs-Präfix, z.B. "nord_a1_benutzer".
        // So hat jede Abteilung ihren eigenen, getrennten Datenbestand.
        function speicherSchluessel(name) {
            return SPEICHER_PRAEFIX + aktuelleAbteilung + '_' + name;
        }

        let speicherFehlerGemeldet = false;
        let datenLadenFehlgeschlagen = false;

        // Gibt true zurück, wenn alles gespeichert wurde
        function datenSpeichern() {
            if (!aktuelleAbteilung) return false;

            // Schutz: Wenn die gespeicherten Daten nicht gelesen werden konnten,
            // NICHT überschreiben (sonst wären sie endgültig weg)
            if (datenLadenFehlgeschlagen) {
                meldungAnzeigen('❌ Gespeicherte Daten sind beschädigt - es wird NICHT gespeichert. Bitte ein Backup wiederherstellen.', 'fehler');
                return false;
            }

            // WICHTIG: Runde alle Guthaben auf 2 Nachkommastellen
            // Grund: JavaScript hat manchmal Rundungsfehler bei
            // Kommazahlen (z.B. 0.1 + 0.2 = 0.30000000000000004)
            for (const kategorie in benutzer) {
                benutzer[kategorie].forEach(person => {
                    if (!person.istPlatzhalter) {
                        person.guthaben = Math.round(person.guthaben * 100) / 100;
                    }
                });
            }

            try {
                // Speichere alles als JSON-Text im Browser
                localStorage.setItem(speicherSchluessel('benutzer'), JSON.stringify(benutzer));
                localStorage.setItem(speicherSchluessel('produktKategorien'), JSON.stringify(produktKategorien));
                localStorage.setItem(speicherSchluessel('einkaufsliste'), JSON.stringify(einkaufsliste));
                localStorage.setItem(speicherSchluessel('abendessenBestellungen'), JSON.stringify(abendessenBestellungen));

                speicherFehlerGemeldet = false;
                console.log('✅ Daten wurden gespeichert!');
                return true;
            } catch (error) {
                // Zum Beispiel: Speicher voll oder privater Modus
                console.error('❌ Speichern fehlgeschlagen:', error);
                meldungAnzeigen('❌ <strong>Speichern fehlgeschlagen!</strong> Die letzte Änderung ist nicht gesichert. Bitte sofort ein Backup erstellen.', 'fehler');
                if (!speicherFehlerGemeldet) {
                    speicherFehlerGemeldet = true;
                    alert('⚠️ SPEICHERN FEHLGESCHLAGEN!\n\nDie letzte Änderung wurde nicht gesichert (Speicher voll?).\n\nBitte jetzt ein Backup erstellen und das Problem prüfen.');
                }
                return false;
            }
        }

        // Löscht Historie-Einträge, die älter als 30 Tage sind. Gibt die Anzahl zurück.
        function historieAufraeumen() {
            const grenze = new Date();
            grenze.setDate(grenze.getDate() - 30);

            let geloescht = 0;
            for (const kategorie in benutzer) {
                benutzer[kategorie].forEach(person => {
                    if (person.historie && person.historie.length > 0) {
                        const vorher = person.historie.length;
                        person.historie = person.historie.filter(eintrag => new Date(eintrag.datum) >= grenze);
                        geloescht += vorher - person.historie.length;
                    }
                });
            }
            return geloescht;
        }

        /* Gleicht die Abendessen-Liste mit den aktuellen Personen ab.
           Die Liste merkt sich die Position (benutzerIndex) der Person. Ändert sich die
           Personenliste (Person gelöscht, Backup eingespielt), müssen die Positionen
           neu zugeordnet werden. Einträge von nicht mehr vorhandenen Personen entfallen. */
        function abendessenNeuZuordnen() {
            abendessenBestellungen = abendessenBestellungen.filter(eintrag => {
                const personen = benutzer[eintrag.kategorie] || [];
                const aktuell = personen[eintrag.benutzerIndex];

                // Position stimmt noch
                if (aktuell && !aktuell.istPlatzhalter && aktuell.name === eintrag.name) {
                    return true;
                }

                // Sonst Person über den Namen neu suchen
                const neuerIndex = personen.findIndex(p => !p.istPlatzhalter && p.name === eintrag.name);
                if (neuerIndex === -1) return false;

                eintrag.benutzerIndex = neuerIndex;
                return true;
            });
        }

        function datenLaden() {
            try {
                // Lade gespeicherte Daten dieser Abteilung aus dem Browser
                const gespeicherteBenutzer = localStorage.getItem(speicherSchluessel('benutzer'));
                const gespeicherteKategorien = localStorage.getItem(speicherSchluessel('produktKategorien'));
                const gespeicherteEinkaufsliste = localStorage.getItem(speicherSchluessel('einkaufsliste'));
                const gespeicherteAbendessenBestellungen = localStorage.getItem(speicherSchluessel('abendessenBestellungen'));

                // Wenn Daten vorhanden sind, lade sie
                if (gespeicherteBenutzer) {
                    const geladen = JSON.parse(gespeicherteBenutzer);
                    benutzer = standardBenutzer();

                    for (const kategorie in KATEGORIEN) {
                        if (Array.isArray(geladen[kategorie])) {
                            benutzer[kategorie] = geladen[kategorie];
                        }
                    }

                    // Stelle sicher, dass jede Person die Listen für Tagesbestellungen und Historie hat
                    for (const kategorie in benutzer) {
                        benutzer[kategorie].forEach(person => {
                            if (!person.tagesbestellungen) {
                                person.tagesbestellungen = [];
                            }
                            if (!person.historie) {
                                person.historie = [];
                            }
                        });
                    }
                }

                if (gespeicherteKategorien) {
                    produktKategorien = JSON.parse(gespeicherteKategorien);

                    // Erstelle flache Produktliste neu (für schnellen Zugriff per ID)
                    alleProdukteFlach = [];
                    produktKategorien.forEach(kategorie => {
                        alleProdukteFlach = alleProdukteFlach.concat(kategorie.produkte);
                    });
                }

                if (gespeicherteEinkaufsliste) {
                    einkaufsliste = JSON.parse(gespeicherteEinkaufsliste);
                }

                if (gespeicherteAbendessenBestellungen) {
                    abendessenBestellungen = JSON.parse(gespeicherteAbendessenBestellungen);
                }

                console.log('✅ Daten wurden geladen!');
            } catch (error) {
                console.error('❌ Laden fehlgeschlagen:', error);
                datenLadenFehlgeschlagen = true;
                alert('⚠️ Die gespeicherten Daten dieser Abteilung konnten nicht gelesen werden.\n\nEs wird nichts überschrieben. Bitte ein Backup wiederherstellen.');
                return;
            }

            // Alte Historie-Einträge (über 30 Tage) beim Anmelden aufräumen
            if (historieAufraeumen() > 0) {
                datenSpeichern();
            }
        }

        /* ========================================
           DESIGN / FARBSCHEMA
           
           Ermöglicht das Umschalten zwischen
           verschiedenen Farbschemata. Wird über
           [data-theme="..."] auf <body> gesteuert
           (siehe styles.css) und in localStorage
           gespeichert, damit die Wahl erhalten bleibt.
           ======================================== */

        function designAnwenden(theme) {
            if (theme === 'klassisch') {
                // Klassisch = kein data-theme-Attribut = Standard-Variablen aus :root
                document.body.removeAttribute('data-theme');
            } else {
                document.body.setAttribute('data-theme', theme);
            }
            
            try {
                localStorage.setItem(SPEICHER_PRAEFIX + 'design', theme);
            } catch (error) {
                console.error('Design konnte nicht gespeichert werden:', error);
            }
            
            designAktivenButtonMarkieren(theme);
        }

        function designAktivenButtonMarkieren(theme) {
            // Entferne "aktiv"-Markierung von allen Design-Buttons
            document.querySelectorAll('.design-option').forEach(btn => {
                btn.classList.remove('aktiv');
            });
            
            // Markiere den aktuell gewählten Button
            const aktiverButton = document.getElementById('design-btn-' + theme);
            if (aktiverButton) {
                aktiverButton.classList.add('aktiv');
            }
        }

        function designLaden() {
            // Lade gespeichertes Farbschema (Standard: klassisch)
            let gespeichertesDesign = 'klassisch';
            try {
                gespeichertesDesign = localStorage.getItem(SPEICHER_PRAEFIX + 'design') || 'klassisch';
            } catch (error) {
                console.error('Design konnte nicht gelesen werden:', error);
            }
            
            if (gespeichertesDesign !== 'klassisch') {
                document.body.setAttribute('data-theme', gespeichertesDesign);
            }
            
            designAktivenButtonMarkieren(gespeichertesDesign);
        }

        /* ========================================
           ABTEILUNGS-ANMELDUNG

           Beim Start wählt man die Abteilung und gibt den
           vierstelligen PIN ein. Danach bleibt das Gerät in
           dieser Abteilung angemeldet, bis jemand auf
           "Abmelden" tippt.
           ======================================== */

        let pinEingabe = '';
        let pinAbteilungId = null;

        function angemeldeteAbteilungLesen() {
            try {
                const id = localStorage.getItem(SPEICHER_PRAEFIX + 'angemeldet');
                return (id && ABTEILUNGEN[id]) ? id : null;
            } catch (error) {
                return null;
            }
        }

        function abteilungLoginAnzeigen() {
            alleBereicheVerstecken();
            document.getElementById('header-buttons').classList.add('hidden');
            document.getElementById('abteilung-login').classList.remove('hidden');
            document.getElementById('wache-name-titel').textContent = '🍽️ Kantine ' + WACHE_NAME;

            // Abteilungs-Buttons aus der Konfiguration aufbauen
            const auswahl = document.getElementById('abteilung-auswahl');
            auswahl.innerHTML = '';
            for (const id in ABTEILUNGEN) {
                const knopf = document.createElement('button');
                knopf.className = 'kategorie-btn';
                knopf.textContent = ABTEILUNGEN[id].name;
                knopf.onclick = () => pinBereichOeffnen(id);
                auswahl.appendChild(knopf);
            }

            pinAbbrechen();
        }

        function pinBereichOeffnen(id) {
            pinAbteilungId = id;
            pinEingabe = '';
            document.getElementById('abteilung-auswahl').classList.add('hidden');
            document.getElementById('abteilung-untertitel').classList.add('hidden');
            document.getElementById('pin-bereich').classList.remove('hidden');
            document.getElementById('pin-titel').textContent = ABTEILUNGEN[id].name;
            pinAnzeigeAktualisieren();
        }

        function pinAbbrechen() {
            pinEingabe = '';
            pinAbteilungId = null;
            document.getElementById('pin-bereich').classList.add('hidden');
            document.getElementById('abteilung-auswahl').classList.remove('hidden');
            document.getElementById('abteilung-untertitel').classList.remove('hidden');
        }

        function pinZiffer(ziffer) {
            if (pinEingabe.length >= 4) return;
            pinEingabe += ziffer;
            pinAnzeigeAktualisieren();

            if (pinEingabe.length === 4) {
                // Kurz warten, damit man die vierte Stelle noch sieht
                setTimeout(pinPruefen, 150);
            }
        }

        function pinLoeschen() {
            pinEingabe = pinEingabe.slice(0, -1);
            pinAnzeigeAktualisieren();
        }

        function pinAnzeigeAktualisieren() {
            document.querySelectorAll('.pin-punkt').forEach((punkt, index) => {
                punkt.classList.toggle('gefuellt', index < pinEingabe.length);
            });
        }

        function pinPruefen() {
            if (!pinAbteilungId) return;

            if (pinEingabe === ABTEILUNGEN[pinAbteilungId].pin) {
                abteilungAnmelden(pinAbteilungId);
            } else {
                const punkte = document.getElementById('pin-punkte');
                punkte.classList.remove('falsch');
                void punkte.offsetWidth; // Animation neu starten
                punkte.classList.add('falsch');

                meldungAnzeigen('Falscher PIN!', 'fehler');
                pinEingabe = '';
                pinAnzeigeAktualisieren();
            }
        }

        function abteilungAnmelden(id) {
            try {
                localStorage.setItem(SPEICHER_PRAEFIX + 'angemeldet', id);
            } catch (error) {
                alert('Anmeldung nicht möglich: Der Browser-Speicher ist nicht verfügbar (privater Modus?).');
                return;
            }
            // Seite neu laden, damit garantiert nur die Daten dieser Abteilung im Speicher sind
            location.reload();
        }

        function abteilungAbmelden() {
            if (!confirm('Von ' + ABTEILUNGEN[aktuelleAbteilung].name + ' abmelden?')) {
                return;
            }
            try {
                localStorage.removeItem(SPEICHER_PRAEFIX + 'angemeldet');
            } catch (error) {
                console.error(error);
            }
            location.reload();
        }

        function appStarten() {
            designLaden();

            const id = angemeldeteAbteilungLesen();
            if (!id) {
                abteilungLoginAnzeigen();
                return;
            }

            aktuelleAbteilung = id;
            datenLaden();

            // Header-Buttons und Abteilungs-Anzeige einblenden
            document.getElementById('header-buttons').classList.remove('hidden');
            document.getElementById('abteilung-badge').textContent = ABTEILUNGEN[id].name;
            document.getElementById('startseite-titel').textContent = '🍽️ Kantine';
            document.getElementById('startseite-untertitel').textContent = WACHE_NAME + ' · ' + ABTEILUNGEN[id].name;

            zurückZurStartseite();

            console.log('🍽️ Kantinen-App gestartet! ' + WACHE_NAME + ' · ' + ABTEILUNGEN[id].name);
        }

        /* ========================================
           NAVIGATION
           
           Diese Funktionen steuern die Seitenansicht.
           Die App hat verschiedene "Bereiche" (Seiten),
           die ein- und ausgeblendet werden.
           
           BEREICHE DER APP:
           1. startseite - Kategorieauswahl (Wachabteilung, B-Dienst, etc.)
           2. benutzer-auswahl - Person aus Kategorie wählen
           3. bestell-bereich - Produkte auswählen und bestellen
           4. koch-bereich - Einkaufsliste und Schulden (KEIN Passwort)
           5. guthaben-login - Passwort-Eingabe für Verwaltung
           6. guthaben-kategorie - Kategorie für Guthaben-Verwaltung wählen
           7. guthaben-personen - Guthaben aufladen/abziehen
           8. preisverwaltung - Preise ändern
           
           WICHTIG: Immer nur EIN Bereich ist sichtbar!
           ======================================== */
        
        function alleBereicheVerstecken() {
            // Verstecke ALLE Bereiche der App
            // Diese Funktion wird vor jedem Seitenwechsel aufgerufen
            // Danach wird der gewünschte Bereich wieder eingeblendet
            document.getElementById('abteilung-login').classList.add('hidden');
            document.getElementById('startseite').classList.add('hidden');
            document.getElementById('benutzer-auswahl').classList.add('hidden');
            document.getElementById('bestell-bereich').classList.add('hidden');
            document.getElementById('koch-bereich').classList.add('hidden');
            document.getElementById('guthaben-login').classList.add('hidden');
            document.getElementById('guthaben-kategorie').classList.add('hidden');
            document.getElementById('guthaben-personen').classList.add('hidden');
            document.getElementById('preisverwaltung').classList.add('hidden');
            document.getElementById('wachabteilung-bearbeiten').classList.add('hidden');
        }

        function zurückZurStartseite() {
            // Gehe zurück zur Startseite und setze alles zurück
            alleBereicheVerstecken();
            document.getElementById('startseite').classList.remove('hidden');
            
            // Zustand zurücksetzen
            aktuelleKategorie = null;
            aktuellerBenutzer = null;
            aktuellerGastIndex = null;
            warenkorb = [];
        }

        function zurückZuBenutzerauswahl() {
            // Gehe zurück zur Benutzer-Liste
            alleBereicheVerstecken();
            document.getElementById('benutzer-auswahl').classList.remove('hidden');
            
            // Benutzer abmelden, aber Kategorie behalten
            aktuellerBenutzer = null;
            warenkorb = [];
            
            // WICHTIG: Liste neu aufbauen, damit aktualisierte Guthaben
            // und neu angelegte Personen sofort sichtbar sind
            benutzerListeAnzeigen();
            
            // Bei Wachabteilung: Schulden-Warnung & Guthaben-Top ebenfalls aktualisieren
            if (aktuelleKategorie === 'wachabteilung') {
                schuldenWarnungAnzeigen();
                guthabenTopAnzeigen();
            }
        }

        /* ========================================
           SORTIERUNG NACH NACHNAMEN
           
           Diese Funktion sortiert Personen
           alphabetisch nach ihrem Nachnamen.
           ======================================== */
        
        function nachNamenSortieren(personen) {
            // Erstelle eine Kopie der Liste
            return [...personen].sort((a, b) => {
                // Platzhalter (leere Gäste) immer ans Ende
                if (a.istPlatzhalter && !b.istPlatzhalter) return 1;
                if (!a.istPlatzhalter && b.istPlatzhalter) return -1;
                if (a.istPlatzhalter && b.istPlatzhalter) return 0;
                
                // Extrahiere Nachname (letztes Wort im Namen)
                const nameA = a.name.split(' ').pop().toLowerCase();
                const nameB = b.name.split(' ').pop().toLowerCase();
                
                // Vergleiche alphabetisch
                return nameA.localeCompare(nameB);
            });
        }

        /* ========================================
           KATEGORIE AUSWÄHLEN (Startseite)
           
           Wird aufgerufen, wenn jemand auf
           "Wachabteilung", "B-Dienst" oder "Gäste"
           klickt.
           ======================================== */
        
        function kategorieAuswaehlen(kategorie) {
            // Merke dir welche Kategorie gewählt wurde
            aktuelleKategorie = kategorie;
            
            // Zeige Benutzer-Auswahl
            alleBereicheVerstecken();
            document.getElementById('benutzer-auswahl').classList.remove('hidden');
            
            // Setze passenden Titel für alle Kategorien
            document.getElementById('kategorie-titel').textContent = KATEGORIEN[kategorie];
            
            // Schulden-Warnung & Guthaben-Top nur bei Wachabteilung anzeigen
            if (kategorie === 'wachabteilung') {
                schuldenWarnungAnzeigen();
                guthabenTopAnzeigen();
            } else {
                document.getElementById('schulden-warnung-box').classList.add('hidden');
                document.getElementById('guthaben-top-box').classList.add('hidden');
            }
            
            // Name-Eingabe nur bei Kategorien mit Platzhaltern anzeigen (Gäste, Azubi)
            if (PLATZHALTER_KATEGORIEN.includes(kategorie)) {
                document.getElementById('platzhalter-eingabe-bereich').classList.remove('hidden');
            } else {
                document.getElementById('platzhalter-eingabe-bereich').classList.add('hidden');
            }
            
            // Zeige die Benutzer-Liste (automatisch sortiert)
            benutzerListeAnzeigen();
        }

        /* ========================================
           SCHULDEN-WARNUNG
           
           Findet die Top 3 Personen mit den höchsten
           Schulden in der Wachabteilung und
           zeigt sie an. Platz 1 in Rot, Platz 2+3 blasser.
           ======================================== */
        
        function schuldenWarnungAnzeigen() {
            const warnung = document.getElementById('schulden-warnung-box');
            
            // Filtere alle Personen mit Schulden (Guthaben < 0) und sortiere
            // vom höchsten Schulden-Betrag zum niedrigsten
            const schuldner = benutzer.wachabteilung
                .filter(person => person.guthaben < 0)
                .sort((a, b) => a.guthaben - b.guthaben) // aufsteigend = höchste Schulden zuerst
                .slice(0, 3); // nur Top 3
            
            // Wenn niemand Schulden hat, Box verstecken
            if (schuldner.length === 0) {
                warnung.classList.add('hidden');
                return;
            }
            
            warnung.className = 'schulden-warnung-box';
            
            let html = '<div class="schulden-warnung-titel">⚠️ Höchste Schulden</div>';
            
            schuldner.forEach((person, index) => {
                const platzKlasse = 'schulden-warnung-platz-' + (index + 1);
                html += `
                    <div class="schulden-warnung-zeile ${platzKlasse}">
                        <span>${person.name}</span>
                        <span>${person.guthaben.toFixed(2)} €</span>
                    </div>
                `;
            });
            
            warnung.innerHTML = html;
        }

        /* ========================================
           GUTHABEN-TOP
           
           Findet die Top 3 Personen mit dem höchsten
           Guthaben in der Wachabteilung und
           zeigt sie an. Platz 1 in Grün, Platz 2+3 blasser.
           ======================================== */
        
        function guthabenTopAnzeigen() {
            const anzeige = document.getElementById('guthaben-top-box');
            
            // Filtere alle Personen mit positivem Guthaben und sortiere
            // vom höchsten Guthaben zum niedrigsten
            const topSparer = benutzer.wachabteilung
                .filter(person => person.guthaben > 0)
                .sort((a, b) => b.guthaben - a.guthaben) // absteigend = höchstes Guthaben zuerst
                .slice(0, 3); // nur Top 3
            
            // Wenn niemand Guthaben hat, Box verstecken
            if (topSparer.length === 0) {
                anzeige.classList.add('hidden');
                return;
            }
            
            anzeige.className = 'schulden-warnung-box guthaben-top-box';
            
            let html = '<div class="schulden-warnung-titel">💰 Höchstes Guthaben</div>';
            
            topSparer.forEach((person, index) => {
                const platzKlasse = 'guthaben-top-platz-' + (index + 1);
                html += `
                    <div class="schulden-warnung-zeile ${platzKlasse}">
                        <span>${person.name}</span>
                        <span>${person.guthaben.toFixed(2)} €</span>
                    </div>
                `;
            });
            
            anzeige.innerHTML = html;
        }

        /* ========================================
           BENUTZER-LISTE ANZEIGEN
           
           Zeigt alle Personen der gewählten
           Kategorie an - SORTIERT NACH NACHNAMEN!
           ======================================== */
        
        function benutzerListeAnzeigen() {
            const liste = document.getElementById('benutzer-liste');
            liste.innerHTML = ''; // Leere die Liste

            // Hole Personen und sortiere sie nach Nachnamen
            let personenListe = nachNamenSortieren(benutzer[aktuelleKategorie]);

            // Noch keine Personen angelegt (z.B. Wachabteilung am Anfang)
            if (personenListe.length === 0) {
                liste.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--color-text-muted);">
                        Noch keine Personen angelegt.<br>
                        In der Verwaltung unter "Wachabteilung bearbeiten" können Personen hinzugefügt werden.
                    </div>
                `;
                return;
            }

            // Erstelle für jede Person eine Karte
            personenListe.forEach((person) => {
                const karte = document.createElement('div');
                
                // Platzhalter anzeigen bei allen Kategorien die sie haben (Gäste, Azubi)
                if (person.istPlatzhalter) {
                    // LEERER PLATZHALTER - ausgegraut, nicht klickbar
                    karte.className = 'benutzer-karte platzhalter';
                    karte.innerHTML = `
                        <div class="benutzer-name">Leerer Platz</div>
                        <div class="benutzer-guthaben" style="color: #95a5a6; font-size: 14px;">
                            Unten Name eingeben
                        </div>
                    `;
                } else {
                    // NORMALE PERSON
                    karte.className = 'benutzer-karte';
                    
                    // Finde Original-Index (wichtig fürs Speichern)
                    const originalIndex = benutzer[aktuelleKategorie].indexOf(person);
                    
                    // Klick auf Karte = Person anmelden
                    karte.onclick = () => benutzerAnmelden(person, originalIndex);
                    
                    // Farbe je nach Guthaben (positiv = grün, negativ = rot)
                    const guthabenKlasse = person.guthaben >= 0 ? 'guthaben-positiv' : 'guthaben-negativ';
                    
                    karte.innerHTML = `
                        <div class="benutzer-name">${person.name}</div>
                        <div class="benutzer-guthaben ${guthabenKlasse}">
                            ${person.guthaben.toFixed(2)} €
                        </div>
                    `;
                }
                
                // Füge Karte zur Liste hinzu
                liste.appendChild(karte);
            });
        }

        /* ========================================
           BENUTZER ANMELDEN
           
           Wird aufgerufen wenn jemand auf eine
           Person klickt. Öffnet dann die
           Bestell-Seite.
           ======================================== */
        
        function benutzerAnmelden(benutzer, index) {
            // Merke dir wer angemeldet ist
            aktuellerBenutzer = benutzer;
            if (aktuelleKategorie === 'gaeste') {
                aktuellerGastIndex = index;
            }
            warenkorb = []; // Leere den Warenkorb
            
            // Zeige Bestell-Seite
            alleBereicheVerstecken();
            document.getElementById('bestell-bereich').classList.remove('hidden');
            
            // Zeige Name und Guthaben an
            document.getElementById('aktueller-benutzer').textContent = benutzer.name;
            document.getElementById('guthaben-anzeige').textContent = benutzer.guthaben.toFixed(2) + ' €';
            
            // Zeige Produkte und Warenkorb
            produkteAnzeigen();
            warenkorbAktualisieren();
            
            // Zeige Tagesübersicht des Benutzers
            benutzerHistorieAnzeigen();
        }

        /* ========================================
           GAST NAME SETZEN
           
           Wenn ein Gastname eingegeben wird,
           wird der erste leere Platzhalter
           mit diesem Namen gefüllt.
           ======================================== */
        
        /* ========================================
           PLATZHALTER NAME SETZEN (Gäste / Notarzt / Azubi)
           
           Eine einzige Funktion für alle drei
           Kategorien mit Platzhaltern.
           Nutzt aktuelleKategorie um zu wissen
           wohin der Name gehört.
           ======================================== */
        
        // Entfernt Sonderzeichen, die die Anzeige stören könnten, und doppelte Leerzeichen
        function namenBereinigen(text) {
            return text.replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim();
        }

        function platzhalterNameSetzen() {
            const name = namenBereinigen(document.getElementById('platzhalter-name-input').value);
            
            // Prüfe ob Name eingegeben wurde
            if (!name) {
                meldungAnzeigen('Bitte einen Namen eingeben!', 'fehler');
                return;
            }

            // Gleicher Name schon vergeben? (würde z.B. beim Abendessen verwechselt)
            if (benutzer[aktuelleKategorie].some(p => !p.istPlatzhalter && p.name.toLowerCase() === name.toLowerCase())) {
                meldungAnzeigen('Dieser Name ist in dieser Kategorie schon vergeben!', 'fehler');
                return;
            }

            // Finde ersten leeren Platzhalter in der AKTUELLEN Kategorie
            const index = benutzer[aktuelleKategorie].findIndex(g => g.istPlatzhalter);
            
            if (index === -1) {
                meldungAnzeigen('Alle 12 Plätze sind belegt!', 'fehler');
                return;
            }

            // Erstelle neuen Eintrag
            benutzer[aktuelleKategorie][index] = {
                name: name,
                guthaben: 0.00,
                istPlatzhalter: false,
                tagesbestellungen: [],
                historie: []
            };

            datenSpeichern();
            document.getElementById('platzhalter-name-input').value = '';
            
            // Melde Person direkt an
            benutzerAnmelden(benutzer[aktuelleKategorie][index], index);
        }

       

        /* ========================================
           PRODUKTE ANZEIGEN
           
           Zeigt alle verfügbaren Produkte auf der
           Bestellseite an, organisiert nach Kategorien.
           
           FUNKTION:
           - Geht durch alle produktKategorien
           - Erstellt für jede Kategorie eine Überschrift
           - Erstellt für jedes Produkt eine Karte mit:
             * Name und Preis
             * Plus/Minus Buttons zur Mengenauswahl
             * Aktuelle Menge aus dem Warenkorb
           
           HINWEIS: Die Menge wird direkt aus dem
           warenkorb-Array gelesen und angezeigt
           ======================================== */
        
        function produkteAnzeigen() {
            const container = document.getElementById('produkte-container');
            container.innerHTML = '';

            // Gehe durch alle Produkt-Kategorien
            produktKategorien.forEach(kategorie => {
                // Erstelle Kategorie-Container
                const katDiv = document.createElement('div');
                katDiv.className = 'produkt-kategorie';
                
                // Überschrift
                const h3 = document.createElement('h3');
                h3.textContent = kategorie.name;
                katDiv.appendChild(h3);
                
                // Produkt-Grid
                const grid = document.createElement('div');
                grid.className = 'produkt-liste';
                
                // Erstelle Karte für jedes Produkt
                kategorie.produkte.forEach(p => {
                    const karte = document.createElement('div');
                    karte.className = 'produkt-karte';
                    
                    // Finde Menge im Warenkorb
                    const imWarenkorb = warenkorb.find(item => item.id === p.id);
                    const menge = imWarenkorb ? imWarenkorb.menge : 0;
                    
                    karte.innerHTML = `
                        <div class="produkt-name">${p.name}</div>
                        <div class="produkt-preis">${p.preis.toFixed(2)} €</div>
                        <div class="menge-steuerung">
                            <button class="menge-btn" onclick="produktEntfernen(${p.id})">−</button>
                            <span class="menge-anzeige" id="menge-${p.id}">${menge}</span>
                            <button class="menge-btn" onclick="produktHinzufugen(${p.id})">+</button>
                        </div>
                    `;
                    
                    grid.appendChild(karte);
                });
                
                katDiv.appendChild(grid);
                container.appendChild(katDiv);
            });
        }

        /* ========================================
           WARENKORB-FUNKTIONEN
           
           Diese Funktionen verwalten den Warenkorb:
           - Produkte hinzufügen (Plus-Button)
           - Produkte entfernen (Minus-Button)
           - Warenkorb anzeigen (Zusammenfassung unten)
           
           WICHTIG: 
           - Bei Plus: Menge wird erhöht ODER Produkt neu hinzugefügt
           - Bei Minus: Menge wird verringert ODER Produkt entfernt (bei 0)
           - Beide Funktionen aktualisieren die Mengen-Anzeige
             bei den Produkten UND im Warenkorb
           ======================================== */
        
        function produktHinzufugen(produktId) {
            // Finde das Produkt in der flachen Produktliste
            const produkt = alleProdukteFlach.find(p => p.id === produktId);
            
            // Prüfe ob Produkt schon im Warenkorb ist
            const vorhandenesItem = warenkorb.find(item => item.id === produktId);
            
            if (vorhandenesItem) {
                // Produkt ist schon im Warenkorb → Erhöhe nur die Menge
                vorhandenesItem.menge++;
            } else {
                // Produkt ist NEU im Warenkorb → Füge es mit Menge 1 hinzu
                warenkorb.push({
                    id: produkt.id,
                    name: produkt.name,
                    preis: produkt.preis,
                    typ: produkt.typ,
                    menge: 1
                });
            }
            
            // Aktualisiere die Mengen-Anzeige beim Produkt (die Zahl neben +/-)
            const mengeElement = document.getElementById('menge-' + produktId);
            if (mengeElement) {
                const item = warenkorb.find(item => item.id === produktId);
                mengeElement.textContent = item ? item.menge : 0;
            }
            
            // Aktualisiere den Warenkorb unten (Zusammenfassung)
            warenkorbAktualisieren();
        }

        function produktEntfernen(produktId) {
            // Finde das Produkt im Warenkorb
            const item = warenkorb.find(item => item.id === produktId);
            
            if (item) {
                // Verringere die Menge um 1
                item.menge--;
                
                // Wenn Menge 0 erreicht → Entferne Produkt komplett aus Warenkorb
                if (item.menge <= 0) {
                    warenkorb = warenkorb.filter(item => item.id !== produktId);
                }
            }
            
            // Aktualisiere die Mengen-Anzeige beim Produkt (die Zahl neben +/-)
            const mengeElement = document.getElementById('menge-' + produktId);
            if (mengeElement) {
                const item = warenkorb.find(item => item.id === produktId);
                mengeElement.textContent = item ? item.menge : 0;
            }
            
            // Aktualisiere den Warenkorb unten (Zusammenfassung)
            warenkorbAktualisieren();
        }

        /* ========================================
           INDIVIDUELLER BETRAG
           
           Ermöglicht das Hinzufügen eines
           benutzerdefinierten Betrags.
           ======================================== */
        
        function individuellenBetragHinzufugen() {
            const betrag = parseFloat(document.getElementById('individueller-betrag-input').value);
            const bezeichnung = document.getElementById('individueller-bezeichnung-input').value.trim();
            
            // Prüfe ob Betrag gültig ist
            if (isNaN(betrag) || betrag <= 0) {
                meldungAnzeigen('Bitte einen gültigen Betrag eingeben!', 'fehler');
                return;
            }
            
            // Nutze Bezeichnung oder Standard-Text
            const name = bezeichnung || 'Individueller Betrag';
            
            // Erstelle einzigartige ID (negativ, damit keine Konflikte)
            const neuId = -Date.now();
            
            // Füge zum Warenkorb hinzu
            warenkorb.push({
                id: neuId,
                name: name,
                preis: betrag,
                typ: 'sonstiges',
                menge: 1,
                istIndividuell: true
            });
            
            // Leere Eingabefelder
            document.getElementById('individueller-betrag-input').value = '';
            document.getElementById('individueller-bezeichnung-input').value = '';
            
            warenkorbAktualisieren();
        }

        function warenkorbAktualisieren() {
            // Hole HTML-Elemente für Warenkorb und Summe
            const warenkorbDiv = document.getElementById('warenkorb');
            const summeSpan = document.getElementById('summe-anzeige');
            
            // FALL 1: Warenkorb ist leer
            if (warenkorb.length === 0) {
                warenkorbDiv.innerHTML = '<p style="color: #95a5a6; text-align: center; padding: 20px;">Warenkorb ist leer</p>';
                summeSpan.textContent = '0.00';
                return;
            }
            
            // FALL 2: Warenkorb hat Produkte
            let html = '';
            let summe = 0;
            
            // Erstelle für jedes Produkt eine Zeile
            // Format: "2× Süßes Klein" (NUR Menge und Name, kein Preis)
            warenkorb.forEach(item => {
                const itemSumme = item.preis * item.menge;
                summe += itemSumme;
                
                html += `
                    <div class="warenkorb-item">
                        <div>
                            <strong>${item.menge}× ${item.name}</strong>
                        </div>
                    </div>
                `;
            });
            
            // Zeige Warenkorb und Gesamtsumme an
            warenkorbDiv.innerHTML = html;
            summeSpan.textContent = summe.toFixed(2);
        }

        /* ========================================
           BESTELLUNG ABSCHLIESSEN
           
           Wird aufgerufen wenn der "Jetzt bestellen"
           Button geklickt wird.
           
           ABLAUF:
           1. Prüfe ob Warenkorb leer ist
           2. Berechne Gesamtsumme
           3. Ziehe Summe vom Guthaben ab
           4. Aktualisiere Einkaufsliste (für Küche)
           5. Speichere Bestellung in Benutzer-Tagesübersicht
           6. Zeige Erfolgsmeldung
           7. Leere Warenkorb und aktualisiere Anzeige
           ======================================== */
        
        function bestellungAbschliessen() {
            // SCHRITT 1: Prüfe ob überhaupt etwas bestellt wurde
            if (warenkorb.length === 0) {
                meldungAnzeigen('Warenkorb ist leer!', 'fehler');
                return;
            }

            // SCHRITT 2: Prüfe ob Abendessen im Warenkorb ist
            const hatAbendessen = warenkorb.some(item => 
                item.typ === 'abendessen_normal' || item.typ === 'abendessen_vegetarisch'
            );
            
            // Wenn Abendessen bestellt wurde, füge Person zur Abendessen-Liste hinzu
            if (hatAbendessen) {
                // Prüfe ob Person schon in der Liste ist
                const schonInListe = abendessenBestellungen.some(eintrag => 
                    eintrag.name === aktuellerBenutzer.name && eintrag.kategorie === aktuelleKategorie
                );
                
                if (!schonInListe) {
                    // Finde Index des Benutzers in seiner Kategorie
                    const benutzerIndex = benutzer[aktuelleKategorie].indexOf(aktuellerBenutzer);
                    
                    // Prüfe ob vegetarisch bestellt wurde
                    const istVegetarisch = warenkorb.some(item => item.typ === 'abendessen_vegetarisch');
                    
                    abendessenBestellungen.push({
                        name: aktuellerBenutzer.name,
                        kategorie: aktuelleKategorie,
                        benutzerIndex: benutzerIndex,
                        vegetarisch: istVegetarisch
                    });
                }
            }

            // SCHRITT 3: Berechne Gesamtsumme OHNE Abendessen (Abendessen = 0€)
            let summe = 0;
            warenkorb.forEach(item => {
                // Abendessen kostet NICHTS beim Bestellen
                if (item.typ !== 'abendessen_normal' && item.typ !== 'abendessen_vegetarisch') {
                    summe += item.preis * item.menge;
                }
            });

            // SCHRITT 4: Ziehe Summe vom Guthaben ab
            // (Guthaben kann negativ werden = Schulden)
            aktuellerBenutzer.guthaben -= summe;

            // SCHRITT 5: Aktualisiere Einkaufsliste
            // Nur Produkte mit passendem "typ" werden gezählt
            // "sonstiges" wird NICHT gezählt
            // ABENDESSEN wird NICHT gezählt (wird separat abgerechnet)
            warenkorb.forEach(item => {
                if (einkaufsliste.hasOwnProperty(item.typ)) {
                    // Überspringe Abendessen - wird separat abgerechnet
                    if (item.typ !== 'abendessen_normal' && item.typ !== 'abendessen_vegetarisch') {
                        einkaufsliste[item.typ] += item.menge;
                    }
                }
            });

            // SCHRITT 6: Speichere Bestellung in Benutzer-Tagesübersicht
            // Damit der Benutzer sehen kann was er heute bestellt hat
            if (!aktuellerBenutzer.tagesbestellungen) {
                aktuellerBenutzer.tagesbestellungen = [];
            }
            
            aktuellerBenutzer.tagesbestellungen.push({
                produkte: warenkorb.map(item => ({
                    name: item.name,
                    menge: item.menge
                })),
                uhrzeit: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            });

            // NEU: Füge zur dauerhaften Historie hinzu (letzte 30 Tage)
            if (!aktuellerBenutzer.historie) {
                aktuellerBenutzer.historie = [];
            }
            
            const jetzt = new Date();
            warenkorb.forEach(item => {
                // Abendessen wird mit 0€ eingetragen (wird später abgerechnet)
                const betrag = (item.typ === 'abendessen_normal' || item.typ === 'abendessen_vegetarisch') 
                    ? 0 
                    : -(item.preis * item.menge);
                
                aktuellerBenutzer.historie.push({
                    datum: jetzt.toISOString().split('T')[0],
                    uhrzeit: jetzt.toTimeString().split(' ')[0].substring(0, 5),
                    aktion: "Bestellung",
                    details: `${item.name}${item.menge > 1 ? ' (' + item.menge + 'x)' : ''}`,
                    betrag: betrag,
                    neuesGuthaben: aktuellerBenutzer.guthaben
                });
            });

            // SCHRITT 7: Speichere alle Änderungen im Browser
            datenSpeichern();

            // SCHRITT 8: Zeige Erfolgsmeldung
            let meldungText = `Bestellung erfolgreich! Summe: ${summe.toFixed(2)} €<br>Neues Guthaben: ${aktuellerBenutzer.guthaben.toFixed(2)} €`;
            if (hatAbendessen) {
                meldungText += '<br>🍽️ <strong>Abendessen vorgemerkt!</strong> Wird später abgerechnet.';
            }
            meldungAnzeigen(meldungText, 'erfolg');

            // SCHRITT 9: Leere Warenkorb und aktualisiere Anzeigen
            warenkorb = [];
            warenkorbAktualisieren();
            
            // Aktualisiere Guthaben-Anzeige oben
            document.getElementById('guthaben-anzeige').textContent = aktuellerBenutzer.guthaben.toFixed(2) + ' €';
            
            // Aktualisiere Tagesübersicht (damit neue Bestellung sichtbar wird)
            benutzerHistorieAnzeigen();
        }

        /* ========================================
           KOCH-BEREICH
           
           Zeigt Schulden und Einkaufsliste an.
           KEIN PASSWORT ERFORDERLICH!
           ======================================== */
        
        function kochBereichOeffnen() {
            alleBereicheVerstecken();
            document.getElementById('koch-bereich').classList.remove('hidden');
            
            schuldenBerechnen();
            einkaufslisteAnzeigen();
            abendessenListeAnzeigen();
        }

        function schuldenBerechnen() {
            let gesamt = 0;

            // Summiere alle negativen Guthaben
            for (const [kategorie, personen] of Object.entries(benutzer)) {
                personen.forEach(person => {
                    if (!person.istPlatzhalter && person.guthaben < 0) {
                        gesamt += Math.abs(person.guthaben);
                    }
                });
            }

            document.getElementById('schulden-betrag').textContent = gesamt.toFixed(2) + ' €';
        }

        function einkaufslisteAnzeigen() {
            const anzeige = document.getElementById('einkaufsliste-anzeige');
            
            // Erstelle dynamische Namen-Zuordnung aus Produkten
            const namen = {};
            alleProdukteFlach.forEach(produkt => {
                if (produkt.typ !== 'sonstiges' && einkaufsliste.hasOwnProperty(produkt.typ)) {
                    namen[produkt.typ] = produkt.name;
                }
            });

            let html = '';
            let gesamt = 0;

            // Erstelle Zeile für jedes Produkt
            for (const [key, menge] of Object.entries(einkaufsliste)) {
                if (menge > 0) {
                    // Verwende dynamischen Namen oder Fallback
                    const anzeigeName = namen[key] || key.replace(/_/g, ' ');
                    
                    html += `
                        <div class="einkaufsitem">
                            <span class="einkaufsitem-name">${anzeigeName}</span>
                            <span class="einkaufsitem-menge">${menge} Stück</span>
                        </div>
                    `;
                    gesamt += menge;
                }
            }

            // Wenn nichts bestellt wurde
            if (gesamt === 0) {
                html = '<p style="text-align: center; color: #95a5a6;">Noch keine Bestellungen</p>';
            }

            anzeige.innerHTML = html;
        }

        /* ========================================
           ABENDESSEN-ABRECHNUNG
           
           Zeigt alle Personen die Abendessen bestellt haben.
           Ermöglicht die Abrechnung am Abend mit dem
           tatsächlichen Preis.
           ======================================== */

        function abendessenListeAnzeigen() {
            const anzeige = document.getElementById('abendessen-liste');
            
            if (!anzeige) return; // Falls Element nicht existiert

            // Bereits eingetippte Preise merken, damit sie beim Neuaufbau der Liste
            // (z.B. nach dem Abrechnen der anderen Sorte) nicht verloren gehen
            const alterPreisNormal = (document.getElementById('abendessen-preis-normal') || {}).value || '';
            const alterPreisVegetarisch = (document.getElementById('abendessen-preis-vegetarisch') || {}).value || '';
            
            // Wenn niemand Abendessen bestellt hat
            if (abendessenBestellungen.length === 0) {
                anzeige.innerHTML = '<p style="text-align: center; color: #95a5a6;">Noch keine Abendessen-Bestellungen</p>';
                return;
            }
            
            let html = '<div style="margin-bottom: 15px;">';
            
            // Zähle Normal und Vegetarisch
            let anzahlNormal = 0;
            let anzahlVegetarisch = 0;
            
            // Erstelle Liste aller Personen (mit Lösch-Button pro Eintrag)
            abendessenBestellungen.forEach((eintrag, index) => {
                if (eintrag.vegetarisch) {
                    anzahlVegetarisch++;
                } else {
                    anzahlNormal++;
                }
                
                const icon = eintrag.vegetarisch ? '🥗' : '🍽️';
                const typ = eintrag.vegetarisch ? '(Vegetarisch)' : '(Normal)';
                
                html += `
                    <div class="einkaufsitem">
                        <span class="einkaufsitem-name">${icon} ${eintrag.name}</span>
                        <span style="display: flex; align-items: center; gap: 10px;">
                            <span class="einkaufsitem-menge">${typ}</span>
                            <button 
                                onclick="abendessenEintragLoeschen(${index})" 
                                class="danger"
                                style="padding: 4px 10px; font-size: 12px; min-width: auto;"
                                title="Person aus Liste entfernen (kein Essen)"
                            >
                                🗑️
                            </button>
                        </span>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Zusammenfassung
            html += `
                <div style="background: #ecf0f1; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                    <strong>Gesamt: ${abendessenBestellungen.length} Personen</strong><br>
                    <span style="font-size: 14px; color: #7f8c8d;">
                        ${anzahlNormal} × Normal | ${anzahlVegetarisch} × Vegetarisch
                    </span>
                </div>
            `;
            
            // Zwei Abrechnungs-Spalten nebeneinander: Links Normal, Rechts Vegetarisch
            html += `
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 220px; background: #fff3cd; padding: 15px; border-radius: 8px; border: 2px solid #ffc107;">
                        <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                            🍽️ Normal (${anzahlNormal} Personen) – Preis pro Person:
                        </label>
                        <input 
                            type="number" 
                            id="abendessen-preis-normal" 
                            placeholder="z.B. 6.50" 
                            step="0.01"
                            style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ffc107; border-radius: 5px; margin-bottom: 10px; box-sizing: border-box;"
                        >
                        <button 
                            onclick="abendessenAbrechnenTyp(false)" 
                            class="primary"
                            style="width: 100%; padding: 15px; font-size: 16px;">
                            ✅ Normal abbuchen
                        </button>
                    </div>
                    <div style="flex: 1; min-width: 220px; background: #fff3cd; padding: 15px; border-radius: 8px; border: 2px solid #ffc107;">
                        <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                            🥗 Vegetarisch (${anzahlVegetarisch} Personen) – Preis pro Person:
                        </label>
                        <input 
                            type="number" 
                            id="abendessen-preis-vegetarisch" 
                            placeholder="z.B. 5.50" 
                            step="0.01"
                            style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ffc107; border-radius: 5px; margin-bottom: 10px; box-sizing: border-box;"
                        >
                        <button 
                            onclick="abendessenAbrechnenTyp(true)" 
                            class="primary"
                            style="width: 100%; padding: 15px; font-size: 16px;">
                            ✅ Vegetarisch abbuchen
                        </button>
                    </div>
                </div>
            `;
            
            anzeige.innerHTML = html;

            // Gemerkte Preise wieder eintragen
            const feldNormal = document.getElementById('abendessen-preis-normal');
            const feldVegetarisch = document.getElementById('abendessen-preis-vegetarisch');
            if (feldNormal) feldNormal.value = alterPreisNormal;
            if (feldVegetarisch) feldVegetarisch.value = alterPreisVegetarisch;
        }

        /* ========================================
           EINZELNEN ABENDESSEN-EINTRAG LÖSCHEN
           
           Entfernt eine Person aus der Abendessen-Liste
           OHNE ihr Geld abzubuchen. Für den Fall, dass
           jemand doch nicht mitisst.
           ======================================== */

        function abendessenEintragLoeschen(index) {
            const eintrag = abendessenBestellungen[index];
            
            if (!eintrag) return;
            
            if (!confirm(`"${eintrag.name}" aus der Abendessen-Liste entfernen?\n\nEs wird KEIN Betrag abgebucht.`)) {
                return;
            }
            
            abendessenBestellungen.splice(index, 1);
            
            datenSpeichern();
            abendessenListeAnzeigen();
            
            meldungAnzeigen(`"${eintrag.name}" wurde aus der Abendessen-Liste entfernt.`, 'erfolg');
        }

        function abendessenAbrechnenTyp(vegetarisch) {
            // Filtere nur die Einträge des gewünschten Typs
            const betroffeneEintraege = abendessenBestellungen.filter(e => !!e.vegetarisch === vegetarisch);
            
            if (betroffeneEintraege.length === 0) {
                meldungAnzeigen(`Keine ${vegetarisch ? 'vegetarischen' : 'normalen'} Abendessen zum Abrechnen vorhanden!`, 'fehler');
                return;
            }
            
            // Hole Preis aus dem passenden Eingabefeld
            const inputId = vegetarisch ? 'abendessen-preis-vegetarisch' : 'abendessen-preis-normal';
            const preisInput = document.getElementById(inputId);
            const preis = parseFloat(preisInput.value);
            
            // Validierung
            if (!preis || isNaN(preis) || preis <= 0) {
                meldungAnzeigen('Bitte einen gültigen Preis eingeben!', 'fehler');
                return;
            }
            
            const bezeichnung = vegetarisch ? 'Vegetarisch' : 'Normal';
            
            // Sicherheitsabfrage
            if (!confirm(`Wirklich ${preis.toFixed(2)} € von ${betroffeneEintraege.length} Personen (${bezeichnung}) abbuchen?\n\nGesamtsumme: ${(preis * betroffeneEintraege.length).toFixed(2)} €`)) {
                return;
            }
            
            // Buche den betroffenen Personen den Betrag ab
            let erfolg = 0;
            const jetzt = new Date();
            
            betroffeneEintraege.forEach(eintrag => {
                try {
                    const person = benutzer[eintrag.kategorie][eintrag.benutzerIndex];
                    if (person) {
                        person.guthaben -= preis;
                        
                        // NEU: Füge zur Historie hinzu
                        if (!person.historie) {
                            person.historie = [];
                        }
                        
                        const abendessenTyp = vegetarisch ? "Abendessen (Vegetarisch)" : "Abendessen (Normal)";
                        person.historie.push({
                            datum: jetzt.toISOString().split('T')[0],
                            uhrzeit: jetzt.toTimeString().split(' ')[0].substring(0, 5),
                            aktion: "Abendessen-Abrechnung",
                            details: abendessenTyp,
                            betrag: -preis,
                            neuesGuthaben: person.guthaben
                        });
                        
                        erfolg++;
                    }
                } catch (error) {
                    console.error('Fehler bei Abbuchung:', error, eintrag);
                }
            });
            
            // Entferne NUR die abgerechneten Einträge des gewünschten Typs aus der Liste,
            // die andere Kategorie (z.B. Vegetarisch wenn gerade Normal abgerechnet wurde) bleibt erhalten
            abendessenBestellungen = abendessenBestellungen.filter(e => !!e.vegetarisch !== vegetarisch);
            
            // Speichere Änderungen
            datenSpeichern();
            
            // Aktualisiere Anzeigen
            abendessenListeAnzeigen();
            schuldenBerechnen();
            
            // Erfolg-Meldung
            meldungAnzeigen(
                `✅ Abendessen (${bezeichnung}) abgerechnet!<br>` +
                `${erfolg} Personen × ${preis.toFixed(2)} € = ${(erfolg * preis).toFixed(2)} € abgebucht`,
                'erfolg'
            );
        }


        /* ========================================
           TAGESABSCHLUSS
           
           Setzt Einkaufsliste auf 0.
           
           ======================================== */
        
        function tagesabschluss() {
            let hinweis = '';
            if (abendessenBestellungen.length > 0) {
                hinweis = '\n\n⚠️ ACHTUNG: Es stehen noch ' + abendessenBestellungen.length + ' Personen auf der Abendessen-Liste, die NICHT abgerechnet sind! Diese Einträge gehen beim Tagesabschluss verloren.';
            }
            if (!confirm('Wirklich Tagesabschluss durchführen?\n\n- Einkaufsliste wird auf 0 gesetzt\n- Alle Tagesübersichten werden geleert\n- Abendessen-Liste wird geleert\n- Backup wird heruntergeladen' + hinweis)) {
                return;
            }

            // Backup herunterladen (nur Personen, Guthaben, Produkte und Preise)
            if (backupHerunterladen()) {
                meldungAnzeigen('✅ Backup erfolgreich erstellt! Datei wurde heruntergeladen.', 'erfolg');
            }

            // Setze Einkaufsliste zurück
            einkaufsliste = {
                brötchen_normal: 0,
                brötchen_mehrkorn: 0,
                brötchen_sunny: 0,
                brötchen_roggen: 0,
                ei: 0,
                abendessen_normal: 0,
                abendessen_vegetarisch: 0
            };

            // Lösche alle Benutzer-Tagesbestellungen
            for (const kategorie in benutzer) {
                benutzer[kategorie].forEach(person => {
                    if (!person.istPlatzhalter) {
                        person.tagesbestellungen = [];
                    }
                });
            }

            // Bereinige Historie - lösche Einträge älter als 30 Tage
            const geloescht = historieAufraeumen();
            console.log(`📅 Historie-Bereinigung: ${geloescht} Einträge älter als 30 Tage gelöscht`);

            // Lösche Abendessen-Bestellungen
            abendessenBestellungen = [];

            datenSpeichern();
            einkaufslisteAnzeigen();
            abendessenListeAnzeigen();

            meldungAnzeigen('Tagesabschluss durchgeführt! Einkaufsliste, Tagesübersichten und Abendessen-Liste auf 0 gesetzt.', 'erfolg');
        }

        /* ========================================
           GUTHABEN-VERWALTUNG
           
           MIT PASSWORT GESCHÜTZT!
           Hier können Guthaben aufgeladen werden.
           ======================================== */
        
        /* Verwaltungs-Zugang: gleicher 4-stelliger PIN wie die angemeldete Abteilung */
        let adminPinEingabe = '';

        function adminPinAnzeigeAktualisieren() {
            document.querySelectorAll('#admin-pin-punkte .pin-punkt').forEach((punkt, index) => {
                punkt.classList.toggle('gefuellt', index < adminPinEingabe.length);
            });
        }

        function guthabenVerwaltungLoginOeffnen() {
            alleBereicheVerstecken();
            adminPinEingabe = '';
            adminPinAnzeigeAktualisieren();
            document.getElementById('guthaben-login').classList.remove('hidden');
        }

        function adminPinZiffer(ziffer) {
            if (adminPinEingabe.length >= 4) return;
            adminPinEingabe += ziffer;
            adminPinAnzeigeAktualisieren();
            if (adminPinEingabe.length === 4) {
                setTimeout(guthabenVerwaltungLogin, 150);
            }
        }

        function adminPinLoeschen() {
            adminPinEingabe = adminPinEingabe.slice(0, -1);
            adminPinAnzeigeAktualisieren();
        }

        function guthabenVerwaltungLogin() {
            // Falls zwischenzeitlich eine andere Seite geöffnet wurde: nichts tun
            if (document.getElementById('guthaben-login').classList.contains('hidden')) return;

            if (adminPinEingabe === ABTEILUNGEN[aktuelleAbteilung].verwaltungsPin) {
                alleBereicheVerstecken();
                document.getElementById('guthaben-kategorie').classList.remove('hidden');
                meldungAnzeigen('Erfolgreich angemeldet', 'erfolg');
            } else {
                const punkte = document.getElementById('admin-pin-punkte');
                punkte.classList.remove('falsch');
                void punkte.offsetWidth;
                punkte.classList.add('falsch');
                meldungAnzeigen('Falscher PIN!', 'fehler');
            }
            adminPinEingabe = '';
            adminPinAnzeigeAktualisieren();
        }

        function guthabenVerwaltungAbmelden() {
            zurückZurStartseite();
        }

        function guthabenKategorieAuswaehlen(kategorie) {
            guthabenVerwaltungKategorie = kategorie;
            alleBereicheVerstecken();
            document.getElementById('guthaben-personen').classList.remove('hidden');
            
            document.getElementById('guthaben-kategorie-titel').textContent = KATEGORIEN[kategorie] + ' - Guthaben verwalten';
            
            guthabenPersonenAnzeigen();
        }

        function zurückZuGuthabenKategorie() {
            alleBereicheVerstecken();
            document.getElementById('guthaben-kategorie').classList.remove('hidden');
        }

        function guthabenPersonenAnzeigen() {
            const liste = document.getElementById('guthaben-personen-liste');
            liste.innerHTML = '';

            // Sortiere nach Namen
            const sortiertePersonen = nachNamenSortieren(benutzer[guthabenVerwaltungKategorie]);

            if (sortiertePersonen.length === 0) {
                liste.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: var(--color-text-muted);">
                        Noch keine Personen angelegt.<br>
                        Unter "Wachabteilung bearbeiten" können Personen hinzugefügt werden.
                    </div>
                `;
                return;
            }

            sortiertePersonen.forEach((person) => {
                // Finde Original-Index
                const index = benutzer[guthabenVerwaltungKategorie].indexOf(person);
                
                if (person.istPlatzhalter) {
                    // Leerer Platzhalter
                    const karte = document.createElement('div');
                    karte.className = 'guthaben-verwaltung-karte';
                    karte.style.opacity = '0.5';
                    karte.innerHTML = `
                        <h3>Leerer Platz</h3>
                        <p style="color: #95a5a6; font-size: 14px;">Keine Person hinterlegt</p>
                    `;
                    liste.appendChild(karte);
                } else {
                    // Person mit Guthaben-Verwaltung
                    const karte = document.createElement('div');
                    karte.className = 'guthaben-verwaltung-karte';
                    
                    const guthabenKlasse = person.guthaben >= 0 ? 'guthaben-positiv' : 'guthaben-negativ';
                    
                    let html = `
                        <h3>${person.name}</h3>
                        <div style="font-size: 20px; margin: 10px 0;" class="${guthabenKlasse}">
                            Aktuell: ${person.guthaben.toFixed(2)} €
                        </div>
                        <div class="guthaben-eingabe">
                            <input type="number" id="betrag-${index}" placeholder="Betrag (z.B. 20.00)" step="0.01">
                            <button class="success" onclick="guthabenErhoehen('${guthabenVerwaltungKategorie}', ${index})">
                                Aufladen
                            </button>
                        </div>
                    `;
                    
                    // Bei Kategorien mit Platzhaltern: Löschen-Button anzeigen
                    if (PLATZHALTER_KATEGORIEN.includes(guthabenVerwaltungKategorie)) {
                        html += `
                            <button class="danger" onclick="platzhalterLoeschen(${index})" style="width: 100%; margin-top: 10px; padding: 10px; font-size: 14px;">
                                Person löschen
                            </button>
                        `;
                    }
                    
                    karte.innerHTML = html;
                    liste.appendChild(karte);
                }
            });
        }

        function guthabenErhoehen(kategorie, index) {
            const betragInput = document.getElementById('betrag-' + index);
            const betrag = parseFloat(betragInput.value);

            if (isNaN(betrag) || betrag <= 0) {
                meldungAnzeigen('Bitte einen gültigen positiven Betrag eingeben!', 'fehler');
                return;
            }

            // Erhöhe Guthaben
            benutzer[kategorie][index].guthaben += betrag;
            
            // NEU: Füge zur Historie hinzu
            if (!benutzer[kategorie][index].historie) {
                benutzer[kategorie][index].historie = [];
            }
            
            const jetzt = new Date();
            benutzer[kategorie][index].historie.push({
                datum: jetzt.toISOString().split('T')[0],
                uhrzeit: jetzt.toTimeString().split(' ')[0].substring(0, 5),
                aktion: "Einzahlung",
                details: "Guthaben aufgeladen",
                betrag: betrag,
                neuesGuthaben: benutzer[kategorie][index].guthaben
            });
            
            datenSpeichern();
            
            betragInput.value = '';
            guthabenPersonenAnzeigen();
            
            meldungAnzeigen(`${betrag.toFixed(2)} € wurden aufgeladen!`, 'erfolg');
        }

        // Löscht eine Person in einer Platzhalter-Kategorie (Gäste/Azubi)
        // Nutzt guthabenVerwaltungKategorie um zu wissen wo gelöscht wird
        function platzhalterLoeschen(index) {
            const person = benutzer[guthabenVerwaltungKategorie][index];
            
            if (confirm(`Wirklich "${person.name}" löschen?\n\nWird zu leerem Platzhalter.`)) {
                benutzer[guthabenVerwaltungKategorie][index] = {
                    name: "",
                    guthaben: 0.00,
                    istPlatzhalter: true,
                    tagesbestellungen: [],
                    historie: []
                };
                abendessenNeuZuordnen();
                
                datenSpeichern();
                guthabenPersonenAnzeigen();
                
                meldungAnzeigen('Person wurde gelöscht!', 'erfolg');
            }
        }

        /* ========================================
           PREISVERWALTUNG
           
           Zeigt alle Produkte nach Kategorien
           und ermöglicht Preis-Änderungen.
           ======================================== */
        
        function preisverwaltungOeffnen() {
            // Öffne Preisverwaltungs-Seite
            alleBereicheVerstecken();
            document.getElementById('preisverwaltung').classList.remove('hidden');
            
            // Zeige alle Preise an
            preiseAnzeigen();
        }
        
        function preiseAnzeigen() {
            const liste = document.getElementById('preisverwaltung-liste');
            liste.innerHTML = '';

            // Gehe durch alle Produkt-Kategorien
            produktKategorien.forEach((kategorie, katIndex) => {
                // Erstelle Kategorie-Container
                const katDiv = document.createElement('div');
                katDiv.className = 'preis-kategorie';
                
                // Überschrift
                const h3 = document.createElement('h3');
                h3.textContent = kategorie.name;
                katDiv.appendChild(h3);
                
                // Produkt-Grid
                const grid = document.createElement('div');
                grid.className = 'preis-grid';
                
                // Erstelle Karte für jedes Produkt
                kategorie.produkte.forEach((produkt, prodIndex) => {
                    const item = document.createElement('div');
                    item.className = 'preis-item';
                    
                    // Prüfe ob Produkt in Einkaufsliste gezählt wird
                    const inEinkaufsliste = einkaufsliste.hasOwnProperty(produkt.typ) && 
                                           produkt.typ !== 'sonstiges';
                    const einkaufslisteIcon = inEinkaufsliste ? '📋 ' : '';
                    
                    // WICHTIG: Abendessen darf NICHT gelöscht werden!
                    const istAbendessen = produkt.typ === 'abendessen_normal' || 
                                         produkt.typ === 'abendessen_vegetarisch';
                    
                    // Löschen-Button nur anzeigen wenn NICHT Abendessen
                    const loeschenButton = istAbendessen ? 
                        `<span style="color: #95a5a6; font-size: 12px; padding: 5px 10px;">🔒 Geschützt</span>` :
                        `<button 
                            onclick="produktLoeschen(${katIndex}, ${prodIndex})" 
                            class="danger"
                            style="padding: 5px 10px; font-size: 12px; min-width: auto;"
                            title="Produkt löschen"
                        >
                            🗑️
                        </button>`;
                    
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
                            <div class="preis-item-name">${einkaufslisteIcon}${produkt.name}</div>
                            ${loeschenButton}
                        </div>
                        <div class="preis-item-aktuell">
                            Aktuell: <strong>${produkt.preis.toFixed(2)} €</strong>
                        </div>
                        <div class="preis-eingabe">
                            <input 
                                type="number" 
                                id="preis-${produkt.id}" 
                                placeholder="Neuer Preis" 
                                step="0.01"
                                inputmode="decimal"
                                value="${produkt.preis.toFixed(2)}"
                            >
                            <button onclick="preisAendern(${produkt.id})">
                                ✓
                            </button>
                        </div>
                    `;
                    
                    grid.appendChild(item);
                });
                
                katDiv.appendChild(grid);
                liste.appendChild(katDiv);
            });
        }

        function preisAendern(produktId) {
            // Hole neuen Preis aus Eingabefeld
            const neuerPreis = parseFloat(document.getElementById('preis-' + produktId).value);
            
            // Validierung
            if (isNaN(neuerPreis) || neuerPreis < 0) {
                meldungAnzeigen('Bitte einen gültigen Preis eingeben!', 'fehler');
                return;
            }

            // Finde Produkt in allen Kategorien
            let gefunden = false;
            produktKategorien.forEach(kategorie => {
                const produkt = kategorie.produkte.find(p => p.id === produktId);
                if (produkt) {
                    const alterPreis = produkt.preis;
                    produkt.preis = neuerPreis;
                    gefunden = true;
                    
                    // Erfolg-Meldung
                    meldungAnzeigen(
                        `Preis für "${produkt.name}" wurde von ${alterPreis.toFixed(2)} € auf ${neuerPreis.toFixed(2)} € geändert!`,
                        'erfolg'
                    );
                }
            });

            if (gefunden) {
                // Aktualisiere flache Produktliste
                alleProdukteFlach = [];
                produktKategorien.forEach(kategorie => {
                    alleProdukteFlach = alleProdukteFlach.concat(kategorie.produkte);
                });
                
                // Speichere Änderungen
                datenSpeichern();
                
                // Aktualisiere Anzeige
                preiseAnzeigen();
            }
        }

        /* ========================================
           PRODUKT LÖSCHEN
           
           Löscht ein Produkt aus einer Kategorie.
           
           SICHERHEIT: Abendessen können NICHT gelöscht werden!
           (Würde Abendessen-Abrechnung kaputt machen)
           ======================================== */

        function produktLoeschen(kategorieIndex, produktIndex) {
            const kategorie = produktKategorien[kategorieIndex];
            const produkt = kategorie.produkte[produktIndex];
            
            // WICHTIG: Abendessen darf NICHT gelöscht werden!
            const istAbendessen = produkt.typ === 'abendessen_normal' || 
                                 produkt.typ === 'abendessen_vegetarisch';
            
            if (istAbendessen) {
                meldungAnzeigen(
                    '⚠️ Abendessen-Produkte können nicht gelöscht werden!<br>' +
                    'Sie sind für die Abendessen-Abrechnung erforderlich.',
                    'fehler'
                );
                return;
            }
            
            // Sicherheitsabfrage
            if (!confirm(`Produkt "${produkt.name}" wirklich löschen?\n\nDies kann nicht rückgängig gemacht werden!`)) {
                return;
            }
            
            // Lösche Produkt aus Kategorie
            kategorie.produkte.splice(produktIndex, 1);
            
            // Aktualisiere flache Produktliste
            alleProdukteFlach = [];
            produktKategorien.forEach(kat => {
                alleProdukteFlach = alleProdukteFlach.concat(kat.produkte);
            });
            
            // Speichere Änderungen
            datenSpeichern();
            
            // Aktualisiere Anzeige
            preiseAnzeigen();
            
            meldungAnzeigen(`✅ Produkt "${produkt.name}" wurde gelöscht!`, 'erfolg');
        }

        /* ========================================
           PRODUKT HINZUFÜGEN
           
           Fügt ein neues Produkt zu einer Kategorie hinzu.
           ======================================== */

        function produktHinzufuegen() {
            // Hole Eingabewerte
            const name = namenBereinigen(document.getElementById('neues-produkt-name').value);
            const preis = parseFloat(document.getElementById('neues-produkt-preis').value);
            const kategorieIndex = parseInt(document.getElementById('neues-produkt-kategorie').value);
            const inEinkaufsliste = document.getElementById('neues-produkt-einkaufsliste').checked;
            
            // Validierung
            if (!name) {
                meldungAnzeigen('Bitte einen Produktnamen eingeben!', 'fehler');
                return;
            }
            
            if (isNaN(preis) || preis < 0) {
                meldungAnzeigen('Bitte einen gültigen Preis eingeben!', 'fehler');
                return;
            }
            
            if (isNaN(kategorieIndex) || kategorieIndex < 0 || kategorieIndex >= produktKategorien.length) {
                meldungAnzeigen('Bitte eine Kategorie auswählen!', 'fehler');
                return;
            }
            
            // Finde höchste ID
            let maxId = 0;
            alleProdukteFlach.forEach(p => {
                if (p.id > maxId) maxId = p.id;
            });
            const neueId = maxId + 1;
            
            // Bestimme Typ
            let typ = 'sonstiges';
            if (inEinkaufsliste) {
                // Erstelle eindeutigen Typ-Namen basierend auf Produktname
                // z.B. "Apfelschorle" -> "apfelschorle"
                const typName = name.toLowerCase()
                    .replace(/ä/g, 'ae')
                    .replace(/ö/g, 'oe')
                    .replace(/ü/g, 'ue')
                    .replace(/ß/g, 'ss')
                    .replace(/[^a-z0-9]/g, '_');
                typ = typName;
                
                // Füge zur Einkaufsliste hinzu (falls noch nicht vorhanden)
                if (!einkaufsliste.hasOwnProperty(typ)) {
                    einkaufsliste[typ] = 0;
                }
            }
            
            // Erstelle neues Produkt
            const neuesProdukt = {
                id: neueId,
                name: name,
                preis: preis,
                typ: typ
            };
            
            // Füge zur Kategorie hinzu
            produktKategorien[kategorieIndex].produkte.push(neuesProdukt);
            
            // Aktualisiere flache Produktliste
            alleProdukteFlach = [];
            produktKategorien.forEach(kat => {
                alleProdukteFlach = alleProdukteFlach.concat(kat.produkte);
            });
            
            // Speichere Änderungen
            datenSpeichern();
            
            // Aktualisiere Anzeige
            preiseAnzeigen();
            
            // Leere Eingabefelder
            document.getElementById('neues-produkt-name').value = '';
            document.getElementById('neues-produkt-preis').value = '';
            document.getElementById('neues-produkt-kategorie').value = '';
            document.getElementById('neues-produkt-einkaufsliste').checked = false;
            
            meldungAnzeigen(
                `✅ Produkt "${name}" wurde zur Kategorie "${produktKategorien[kategorieIndex].name}" hinzugefügt!`,
                'erfolg'
            );
        }

        /* ========================================
           WACHABTEILUNG BEARBEITEN
           
           Ermöglicht das Hinzufügen und Löschen
           von Personen in der Wachabteilung.
           ======================================== */

        function wachabteilungBearbeitenOeffnen() {
            alleBereicheVerstecken();
            document.getElementById('wachabteilung-bearbeiten').classList.remove('hidden');
            wachabteilungPersonenAnzeigen();
        }

        function wachabteilungPersonenAnzeigen() {
            const liste = document.getElementById('wachabteilung-personen-liste');
            liste.innerHTML = '';

            // Sortiere nach Namen
            const sortiertePersonen = nachNamenSortieren(benutzer.wachabteilung);

            sortiertePersonen.forEach((person) => {
                // Finde Original-Index
                const index = benutzer.wachabteilung.indexOf(person);
                
                const karte = document.createElement('div');
                karte.className = 'guthaben-verwaltung-karte';
                
                const guthabenKlasse = person.guthaben >= 0 ? 'guthaben-positiv' : 'guthaben-negativ';
                
                karte.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3>${person.name}</h3>
                            <div style="font-size: 16px; margin-top: 5px;" class="${guthabenKlasse}">
                                Guthaben: ${person.guthaben.toFixed(2)} €
                            </div>
                        </div>
                        <button class="danger" onclick="wachabteilungPersonLoeschen(${index})" style="padding: 10px 20px;">
                            🗑️ Löschen
                        </button>
                    </div>
                `;
                
                liste.appendChild(karte);
            });
        }

        function wachabteilungPersonHinzufugen() {
            const name = namenBereinigen(document.getElementById('wachabteilung-name-input').value);
            
            if (!name) {
                meldungAnzeigen('Bitte einen Namen eingeben!', 'fehler');
                return;
            }

            // Prüfe ob Name bereits existiert
            const existiert = benutzer.wachabteilung.some(p => p.name.toLowerCase() === name.toLowerCase());
            if (existiert) {
                meldungAnzeigen('Diese Person existiert bereits in der Wachabteilung!', 'fehler');
                return;
            }

            // Finde die höchste ID
            let maxId = 0;
            benutzer.wachabteilung.forEach(p => {
                if (p.id) {
                    const num = parseInt(p.id.replace('w', ''));
                    if (num > maxId) maxId = num;
                }
            });

            // Erstelle neue Person mit nächster ID
            const neueId = 'w' + (maxId + 1);
            benutzer.wachabteilung.push({
                id: neueId,
                name: name,
                guthaben: 0.00,
                tagesbestellungen: [],
                historie: []
            });

            datenSpeichern();
            document.getElementById('wachabteilung-name-input').value = '';
            wachabteilungPersonenAnzeigen();
            
            meldungAnzeigen(`${name} wurde zur Wachabteilung hinzugefügt!`, 'erfolg');
        }

        function wachabteilungPersonLoeschen(index) {
            const person = benutzer.wachabteilung[index];
            
            if (!confirm(`Wirklich "${person.name}" aus der Wachabteilung löschen?\n\nAlle Daten (inkl. Guthaben von ${person.guthaben.toFixed(2)} €) gehen verloren!`)) {
                return;
            }

            // Lösche Person aus Array
            benutzer.wachabteilung.splice(index, 1);
            abendessenNeuZuordnen(); // Positionen neu zuordnen, Eintrag der gelöschten Person entfällt
            
            datenSpeichern();
            wachabteilungPersonenAnzeigen();
            
            meldungAnzeigen(`${person.name} wurde aus der Wachabteilung gelöscht!`, 'erfolg');
        }

        /* ========================================
           BENUTZER-TAGESÜBERSICHT
           
           Zeigt die heutigen Bestellungen des 
           aktuell angemeldeten Benutzers an.
           
           Diese Liste erscheint am Ende der 
           Bestellseite als ausklappbares Accordeon.
           
           Wird bei Tagesabschluss (Küchenbereich) 
           für ALLE Benutzer geleert.
           ======================================== */

        function benutzerHistorieToggle() {
            // Klappe Historie-Accordeon auf/zu
            const accordeon = document.getElementById('benutzer-historie-accordeon');
            const inhalt = document.getElementById('benutzer-historie-inhalt');
            accordeon.classList.toggle('offen');
            inhalt.classList.toggle('hidden');
        }

        function benutzerHistorieAnzeigen() {
            const liste = document.getElementById('benutzer-historie-liste');
            const badge = document.getElementById('benutzer-historie-badge');
            
            // Prüfe ob Benutzer angemeldet ist
            if (!aktuellerBenutzer) {
                return;
            }
            
            // Initialisiere Historie falls nicht vorhanden
            if (!aktuellerBenutzer.historie) {
                aktuellerBenutzer.historie = [];
            }

            // Anzahl der Einträge anzeigen
            const anzahl = aktuellerBenutzer.historie.length;
            badge.textContent = anzahl + ' Eintrag' + (anzahl !== 1 ? 'e' : '');

            // Wenn noch keine Historie
            if (anzahl === 0) {
                liste.innerHTML = '<div class="tagesuebersicht-leer">Noch keine Bestellungen in den letzten 30 Tagen</div>';
                return;
            }

            let html = '';

            // Zeige alle Einträge (neueste zuerst)
            const eintraege = [...aktuellerBenutzer.historie].reverse();
            
            eintraege.forEach(eintrag => {
                const betragClass = eintrag.betrag >= 0 ? 'guthaben-positiv' : 'guthaben-negativ';
                const betragPrefix = eintrag.betrag >= 0 ? '+' : '';
                
                html += `
                    <div class="tages-bestellung" style="border-left: 3px solid ${eintrag.betrag >= 0 ? '#27ae60' : '#e74c3c'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span style="color: #7f8c8d; font-size: 12px;">${eintrag.datum} ${eintrag.uhrzeit}</span>
                            <span class="${betragClass}" style="font-weight: bold; font-size: 14px;">${betragPrefix}${eintrag.betrag.toFixed(2)} €</span>
                        </div>
                        <div class="tages-bestellung-produkte" style="margin-bottom: 3px;">
                            <strong>${eintrag.aktion}:</strong> ${eintrag.details}
                        </div>
                        <div style="color: #95a5a6; font-size: 11px;">
                            Neues Guthaben: ${eintrag.neuesGuthaben.toFixed(2)} €
                        </div>
                    </div>
                `;
            });

            liste.innerHTML = html;
        }

        /* ========================================
           MELDUNGEN ANZEIGEN
           
           Zeigt Erfolgs- oder Fehler-Meldungen
           für 5 Sekunden an.
           ======================================== */
        
        let meldungTimer = null;

        function meldungAnzeigen(text, typ) {
            const meldungDiv = document.getElementById('meldung');
            meldungDiv.className = 'meldung ' + typ;
            meldungDiv.innerHTML = text;
            meldungDiv.style.display = 'block';
            
            // Verstecke nach 5 Sekunden (alter Timer wird abgebrochen,
            // damit eine neue Meldung nicht zu früh verschwindet)
            clearTimeout(meldungTimer);
            meldungTimer = setTimeout(() => {
                meldungDiv.style.display = 'none';
            }, 5000);
        }

        /* ========================================
           BACKUP & RESTORE
           
           Ermöglicht das Sichern und Wiederherstellen
           ALLER Daten (Benutzer, Guthaben, Preise, etc.)
           
           VERWENDUNG:
           - Backup erstellen: Im Verwaltungsbereich
           - Backup wiederherstellen: Im Verwaltungsbereich
           - Bei App-Update: Backup → Update → Restore
           ======================================== */

        // Datum im Format JJJJ-MM-TT (lokale Zeit, nicht UTC)
        function lokalesDatum() {
            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
        }

        /* Baut das Backup-Objekt. SCHLANK: nur Personen mit Guthaben
           (positiv wie negativ), Produkte und Preise.
           KEINE Bestellhistorie, KEINE Tagesbestellungen,
           KEINE Einkaufsliste, KEINE Abendessen-Liste. */
        function backupDatenErstellen() {
            const schlank = {};
            for (const kategorie in KATEGORIEN) {
                schlank[kategorie] = benutzer[kategorie].map(person => {
                    if (person.istPlatzhalter) {
                        return { name: "", guthaben: 0.00, istPlatzhalter: true };
                    }
                    const eintrag = {
                        name: person.name,
                        guthaben: Math.round(person.guthaben * 100) / 100,
                        istPlatzhalter: false
                    };
                    if (person.id) eintrag.id = person.id;
                    return eintrag;
                });
            }

            return {
                datum: new Date().toLocaleString('de-DE'),
                version: "nord-1",
                wache: WACHE_NAME,
                abteilung: aktuelleAbteilung,
                abteilungName: ABTEILUNGEN[aktuelleAbteilung].name,
                benutzer: schlank,
                produktKategorien: produktKategorien
            };
        }

        // Erstellt die Backup-Datei und startet den Download. Gibt true/false zurück.
        function backupHerunterladen() {
            const jsonString = JSON.stringify(backupDatenErstellen(), null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const abteilungKurz = ABTEILUNGEN[aktuelleAbteilung].name.toLowerCase().replace(/\s+/g, '-');
            const dateiname = 'kantine-nord-' + abteilungKurz + '-' + lokalesDatum() + '.json';

            const a = document.createElement('a');
            a.href = url;
            a.download = dateiname;
            a.style.display = 'none';
            document.body.appendChild(a);

            try {
                a.click();

                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);

                return true;
            } catch (error) {
                console.error('Backup-Fehler:', error);
                meldungAnzeigen('❌ Backup-Download fehlgeschlagen. Siehe Browser-Konsole.', 'fehler');
                return false;
            }
        }

        function backupErstellen() {
            if (backupHerunterladen()) {
                meldungAnzeigen('✅ Backup erfolgreich erstellt! Datei wurde heruntergeladen.', 'erfolg');
            }
        }

        /* Baut aus den Backup-Daten die Benutzer-Struktur der App neu auf.
           Nimmt nur die Kategorien dieser Wache (Wachabteilung, Gäste, Auszubildende, Tagesdienst, Leitstelle).
           Andere Kategorien aus älteren Backups (B-Dienst, Notarzt ...) werden ignoriert. */
        function benutzerAusBackupAufbauen(backupBenutzer) {
            const neu = standardBenutzer();

            for (const kategorie in KATEGORIEN) {
                const quelle = backupBenutzer[kategorie];
                if (!Array.isArray(quelle)) continue;

                neu[kategorie] = quelle.map(person => {
                    if (person.istPlatzhalter) {
                        return { name: "", guthaben: 0.00, istPlatzhalter: true, tagesbestellungen: [], historie: [] };
                    }
                    const eintrag = {
                        name: String(person.name || ''),
                        guthaben: Math.round((parseFloat(person.guthaben) || 0) * 100) / 100,
                        istPlatzhalter: false,
                        tagesbestellungen: [],
                        historie: []
                    };
                    if (person.id) eintrag.id = person.id;
                    return eintrag;
                });

                // Kategorien mit Platzhaltern wieder auf 12 Plätze auffüllen
                if (PLATZHALTER_KATEGORIEN.includes(kategorie)) {
                    while (neu[kategorie].length < PLATZHALTER_ANZAHL) {
                        neu[kategorie].push(...neuePlatzhalter(1));
                    }
                }
            }

            return neu;
        }

        function backupWiederherstellen() {
            const abteilungName = ABTEILUNGEN[aktuelleAbteilung].name;

            // Bestätigung einholen
            if (!confirm('⚠️ ACHTUNG!\n\nDas Wiederherstellen eines Backups überschreibt die Daten von ' + abteilungName + ':\n- Alle Personen und Guthaben\n- Alle Produkte und Preise\n\nMöchtest du wirklich fortfahren?')) {
                return;
            }

            // Erstelle verstecktes Datei-Input Element
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';

            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;

                // Lese Datei
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        // Parse JSON
                        const backup = JSON.parse(event.target.result);

                        // Validierung
                        if (!backup.benutzer || !Array.isArray(backup.produktKategorien) ||
                            !backup.produktKategorien.every(k => k && Array.isArray(k.produkte))) {
                            throw new Error('Ungültiges Backup-Format');
                        }

                        // Warnung, falls das Backup aus einer anderen Abteilung stammt
                        if (backup.abteilung && backup.abteilung !== aktuelleAbteilung) {
                            const herkunft = backup.abteilungName || backup.abteilung;
                            if (!confirm('⚠️ Dieses Backup stammt aus "' + herkunft + '", du bist aber in "' + abteilungName + '" angemeldet.\n\nTrotzdem einspielen? Die Daten von ' + abteilungName + ' werden überschrieben.')) {
                                return;
                            }
                        }

                        // Stelle Daten wieder her
                        benutzer = benutzerAusBackupAufbauen(backup.benutzer);
                        produktKategorien = backup.produktKategorien;

                        // Aktualisiere flache Produktliste
                        alleProdukteFlach = [];
                        produktKategorien.forEach(kategorie => {
                            alleProdukteFlach = alleProdukteFlach.concat(kategorie.produkte);
                        });

                        // Abendessen-Liste an die wiederhergestellten Personen anpassen
                        abendessenNeuZuordnen();

                        // Falls vorher beschädigte Daten blockiert waren: jetzt wieder freigeben
                        datenLadenFehlgeschlagen = false;

                        // Speichere alles
                        if (!datenSpeichern()) {
                            return;
                        }

                        // Erfolg!
                        meldungAnzeigen(
                            `✅ Backup erfolgreich wiederhergestellt!<br>` +
                            `📅 Backup-Datum: ${backup.datum || 'Unbekannt'}<br>` +
                            `Seite wird neu geladen...`,
                            'erfolg'
                        );

                        // Seite neu laden nach 2 Sekunden
                        setTimeout(() => {
                            location.reload();
                        }, 2000);

                    } catch (error) {
                        console.error('Restore-Fehler:', error);
                        meldungAnzeigen(
                            '❌ Fehler beim Wiederherstellen!<br>' +
                            'Stelle sicher, dass die Datei ein gültiges Backup ist.',
                            'fehler'
                        );
                    }
                };

                reader.onerror = function() {
                    meldungAnzeigen('❌ Fehler beim Lesen der Datei!', 'fehler');
                };

                reader.readAsText(file);
            };

            // Öffne Dateiauswahl
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        }

        /* ========================================
           APP START
           
           Wird aufgerufen wenn die Seite geladen
           wird. Lädt gespeicherte Daten.
           ======================================== */
        
        /* ========================================
           TIPP-FEEDBACK (Touch)

           Beim Tippen auf Kategorie-Buttons, Personen-Karten
           und "Zurück" wird die Fläche kurz hervorgehoben
           und die Seite erst ~0,15 s später gewechselt.
           So landet der Finger nicht schon auf dem neuen
           Bildschirm und markiert dort versehentlich ein Feld.
           Währenddessen werden weitere Tipps ignoriert
           (verhindert Doppel-Auslösung).
           ======================================== */
        const TIPP_VERZOEGERUNG_MS = 150;
        let tippWartet = false;

        document.addEventListener('click', function(e) {
            if (window.__keineVerzoegerung || e.__verzoegert) return;

            const ziel = e.target.closest && e.target.closest('.kategorie-btn, .benutzer-karte:not(.platzhalter), .zurück-btn');
            if (!ziel) return;

            // Klick abfangen und verzögert erneut auslösen
            e.stopImmediatePropagation();
            e.preventDefault();
            if (tippWartet) return;

            tippWartet = true;
            ziel.classList.add('gedrueckt');

            setTimeout(() => {
                ziel.classList.remove('gedrueckt');
                tippWartet = false;
                // Seite hat sich evtl. neu aufgebaut: nur auslösen, wenn das Element noch da ist
                if (document.body.contains(ziel)) {
                    const klick = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                    klick.__verzoegert = true;
                    ziel.dispatchEvent(klick);
                }
            }, TIPP_VERZOEGERUNG_MS);
        }, true);

        // App starten, sobald die Seite geladen ist
        document.addEventListener('DOMContentLoaded', appStarten);
