# Gardener Roadmap: Von Gartenplaner zur Selbstversorger-Plattform

> 8 Phasen, um Gardener von einem Beetplaner zur ultimativen Selbstversorger-App auszubauen.

## Status Quo

- 40 Pflanzen (Gemuese, Obst, Beeren, Kraeuter) mit Mischkultur-Daten
- Drag & Drop Beetplaner mit Companion/Antagonist-Indikatoren
- Fruchtfolge-Planung nach Pflanzenfamilien
- Saison-Timeline-Visualisierung
- Wetter-Dashboard (OpenWeatherMap)
- Aufgaben-Kalender mit Auto-Generierung
- Export/Import von Gartenplaenen
- PWA mit Offline-Support
- Docker-Deployment + GitHub Pages
- Zweisprachig (DE/EN)

---

## Phase 1: Gewaechshaus & Wachstumsumgebungen

**Zeitraum:** Monate 1-2

### Features
- **Umgebungstyp-System** fuer Beete: Freiland, Hochbeet, Gewaechshaus, Fruehbeet, Folientunnel, Container/Balkon, Fensterbank, Vertikal
- **Gewaechshaus-Konfigurator**: Material (Glas/Polycarbonat/Folie), Heizung (keine/elektrisch/Gas/passiv-solar), Lueftung (manuell/automatisch), Min/Max-Zieltemperatur
- **Saison-Verlaengerung**: Gewaechshaus-Beete bekommen erweiterte Anbausaison (konfigurierbarer Frostschutz-Offset in Wochen)
- **Intelligente Aufgaben**: Task-Generierung beruecksichtigt Umgebungstyp (z.B. Tomaten im Gewaechshaus 4 Wochen frueher vorziehen)
- **Container-Modus**: Beete als Toepfe/Container mit Volumen statt Raster
- **Visuelle Unterscheidung**: Beete mit Icons/Badges je nach Umgebungstyp
- **Hochbeet-Konfig**: Hoehe, Schichtaufbau (Aeste, Kompost, Erde)

### Datenmodell
```typescript
type EnvironmentType = "outdoor_bed" | "raised_bed" | "greenhouse" | "cold_frame"
  | "polytunnel" | "container" | "windowsill" | "vertical";

interface GreenhouseConfig {
  material: "glass" | "polycarbonate" | "plastic";
  heated: boolean;
  heatingType?: "electric" | "gas" | "passive_solar";
  ventilation: "manual" | "automatic";
  minTempC: number;
  maxTempC: number;
  frostProtectionWeeks: number;
}

interface ContainerConfig { volumeLiters: number; material: string; }
interface RaisedBedConfig { heightCm: number; layers?: string[]; }
```

---

## Phase 2: Ernte-Tracking, Gartentagebuch & Mehrjahres-Verlauf

**Zeitraum:** Monate 3-4

### Features
- **Ernte-Log**: Gewicht, Stueckzahl, Datum, Qualitaet (1-5 Sterne), Fotos pro Ernte
- **Gartentagebuch**: Datierte Eintraege mit Text, Fotos, optionale Beet/Pflanzen-Zuordnung
- **Saison-Konzept**: Gaerten bekommen ein Jahr/Saison-Feld, Archiv vergangener Saisons
- **Saisonwechsel**: Aktuellen Stand archivieren, neue Saison mit Fruchtfolge-Vorschlaegen starten
- **Ernte-Analytik**: Balkendiagramme: tatsaechliche vs. erwartete Ernte pro Pflanze ueber Saisons
- **Foto-System**: Browser File API + IndexedDB fuer lokale Bild-Speicherung
- **PDF-Export**: Tagebuch als PDF exportieren

### Datenmodell
```typescript
interface HarvestEntry {
  id: string; gardenId: string; bedId: string; plantId: string;
  date: string; weightGrams?: number; count?: number;
  quality: 1|2|3|4|5; notes?: string; photoIds?: string[];
}

interface JournalEntry {
  id: string; gardenId: string; date: string; text: string;
  photoIds?: string[]; tags?: string[]; bedId?: string; plantId?: string;
}
```

---

## Phase 3: Smarte Wetter-Alerts & Push-Benachrichtigungen

**Zeitraum:** Monate 5-6

### Features
- **Frost-Alarm**: Push-Notification wenn Vorhersage unter Schwellwert, mit Aktions-Items ("Tomaten abdecken!")
- **Gewaechshaus-Alerts**: Lueftungs-Erinnerungen bei Ueberhitzung, Heiz-Warnungen bei Kaelte
- **Giess-Empfehlungen**: Basierend auf Regen, Vorhersage, Pflanzenbedarf, Bodentyp
- **Wochen-Wetter-Zusammenfassung**: "Gute Woche zum Umpflanzen - kein Frost in 10-Tage-Vorhersage"
- **Web Push API**: Service Worker ist schon da (PWA)
- **Wetter-Historie**: Taegliche Wetterdaten speichern fuer lokales Klimaprofil
- **Benachrichtigungs-Einstellungen**: Pro Alert-Typ aktivierbar

---

## Phase 4: Selbstversorger-Rechner & Konservierung

**Zeitraum:** Monate 7-9

> *"Kann ich meine Familie mit diesem Garten ernaehren?"* -- DAS Feature, das Gardener von jedem anderen Gartenplaner unterscheidet.

### Features
- **Kalorien/Naehrwert-Rechner**: Pflanzendaten erweitern um kcal, Protein, Vitamine pro 100g
- **Familien-Planer**: Haushaltsgroesse eingeben, Naehrwert-Abdeckung in Prozent sehen
- **Ertrags-Schaetzung**: Aus Beetflaeche, Pflanzabstand und historischen Daten die erwartete Produktion in kg berechnen
- **Luecken-Analyse**: "40% Vitamin C gedeckt, aber nur 10% Protein - mehr Bohnen anbauen!"
- **Konservierungs-Planer**: Pro Ernte Methoden vorschlagen (Einkochen, Fermentieren, Einfrieren, Trocknen)
- **Konservierungs-Kalender**: Wann starten, Haltbarkeit tracken
- **Saatgut-Kalender**: Welche Pflanzen versamen lassen, wann Samen ernten, Lagerung
- **Kompost-Rechner**: C:N-Verhaeltnis, Temperatur-Tracking, geschaetzter Fertigtermin

### Datenmodell-Erweiterung
```typescript
// Plant type erweitern
caloriesPer100g?: number;
proteinPer100g?: number;
vitaminCPer100g?: number;
fiberPer100g?: number;
expectedYieldKgPerM2?: number;
preservationMethods?: ("canning"|"freezing"|"fermenting"|"drying"|"root_cellar")[];
seedSaving?: {
  difficulty: "easy"|"moderate"|"advanced";
  isolationDistanceM?: number;
  seedViabilityYears: number;
};
```

---

## Phase 5: Community, Sharing & Erweiterbare Pflanzendatenbank

**Zeitraum:** Monate 10-13

### Features
- **Garten-Templates teilen**: Exportieren als Link, andere koennen importieren
- **Community-Pflanzendatenbank**: User fuegen lokale Sorten hinzu
- **Sorten-System**: "Tomate" wird Gattung mit Sorten ("San Marzano", "Ochsenherz") mit eigenen Eigenschaften
- **Saatgut-Tausch**: Samen anbieten/suchen, Matching mit Gaertnern in der Naehe
- **Garten-Galerie**: Oeffentliche Vorher/Nachher-Zeitraffer (opt-in aus Tagebuch)
- **Regionale Anbaufuehrer**: Community-Pflanzkalender fuer spezifische Klimazonen
- **User-Accounts**: Authentifizierung (Voraussetzung fuer alles Soziale)

### Technische Entscheidungen
- Auth: Lightweight (z.B. better-auth) mit bestehendem Express
- Garten-Templates ohne Account teilbar (URL mit Hash)
- Community-Pflanzen mit Moderations-Queue
- Pflanzenkatalog: von statischem JSON zu dynamischer DB
- Migration von SQLite zu PostgreSQL fuer Multi-User

---

## Phase 6: Fortgeschrittene Planung & Visualisierung

**Zeitraum:** Monate 14-17

### Features
- **Sukzessionssaat**: Automatisch gestaffelte Aussaaten planen (z.B. Salat alle 3 Wochen)
- **Permakultur-Gilden**: Vordefinierte Pflanzen-Kombinationen ("Drei Schwestern": Mais+Bohne+Kuerbis)
- **Waldgarten-Planer**: Vertikale Schichten-Visualisierung (Kronendach, Unterholz, Bodendecker, Wurzel, Kletter)
- **Sonnenlicht-Simulation**: Schattenberechnung basierend auf Gartenausrichtung + Gebaeude/Baeume (SunCalc Library)
- **Bewaesserungs-Planer**: Tropfschlaeuche, Sprinkler-Zonen auf dem Gartenraster planen
- **3D-Gartenansicht**: WebGL-Vogelperspektive mit Three.js / React Three Fiber (lazy-loaded)

### Datenmodell
```typescript
// Garden erweitern
orientation: number;               // Grad von Norden
structures: Structure[];           // Zaeune, Gebaeude, Baeume (Schatten)
irrigationZones: IrrigationZone[];
```

---

## Phase 7: IoT, Mobile App & KI

**Zeitraum:** Monate 18-22

### Features
- **Sensor-Integration**: Bodenfeuchtigkeit, Temperatur, Wetterstationen via MQTT/HTTP
- **Sensor-Dashboard**: Echtzeit-Messwerte pro Beet/Gewaechshaus mit Verlaufs-Charts
- **Automatische Sensor-Alerts**: "Gewaechshaus 38 Grad C - Lueftung oeffnen!"
- **Kalender-Sync**: Export zu Google Calendar, iCal, CalDAV
- **Mobile App**: PWA mit Capacitor wrappen fuer App Store (Kamera, Push, Bluetooth fuer Sensoren)
- **KI-Schaedlingserkennung**: Foto hochladen, Diagnose und Behandlungsvorschlaege
- **KI-Pflanzberater**: Standort + Klima + Platz + Ziele ergibt optimalen Gartenplan
- **Familien-Accounts**: Gemeinsamer Garten mit Rollen-Berechtigungen

### Technische Entscheidungen
- TimescaleDB oder InfluxDB fuer Sensor-Zeitreihen
- Capacitor statt React Native (95%+ Code wiederverwendbar)
- KI ueber API-Calls (Claude/OpenAI Vision) mit Backend als Proxy

---

## Phase 8: Marktplatz & Oekosystem

**Zeitraum:** Monate 23+

### Features
- **Saatgut-Katalog-Integration**: Direktlinks zu Anbietern aus Pflanzempfehlungen
- **Kosten-Tracking**: Ausgaben fuer Samen, Werkzeug, Duenger loggen
- **ROI-Dashboard**: "Dein Garten hat X Euro an Lebensmitteln produziert bei Y Euro Kosten"
- **Marktplatz fuer Garten-Templates**: Premium Permakultur-Designs, Waldgarten-Plaene
- **Energie-Planer fuer Gewaechshaeuser**: Heizkosten-Schaetzung basierend auf lokalen Energiepreisen
- **Regenwasser-Rechner**: Dachflaeche, Regenmenge, Tankgroesse
- **Premium-Tier**: Cloud-Sync, unbegrenzte Fotos, KI-Features, erweiterte Analytik
- **REST-API**: Plugin-Oekosystem fuer Drittanbieter

---

## Architektur-Evolution

| Aspekt | Phase 1-3 | Phase 4-5 | Phase 6-8 |
|--------|-----------|-----------|-----------|
| **State** | Zustand + localStorage | + IndexedDB fuer Fotos | Sync-Engine (ElectricSQL) |
| **Backend** | Express + SQLite | PostgreSQL + Drizzle ORM | + TimescaleDB + Redis |
| **Auth** | Keine | better-auth | OAuth + Familien-Accounts |
| **Pflanzendaten** | Statisches JSON | JSON + User-Erweiterungen | Dynamische DB + Community |
| **Tests** | Vitest, Store + Daten | + Algorithmen-Tests | + E2E mit Playwright |
| **Bundle** | ~450KB | ~600KB + lazy chunks | + Three.js lazy, Code-Splitting |
