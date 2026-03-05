# Agents.md

## Quelle der Wahrheit

Alle Agents MÜSSEN zuerst folgendes Verzeichnis lesen und als primäre Quelle der Wahrheit betrachten:

```
packages/aherzog/hubjutsu
```

Berücksichtige das packages/aherzog/hubjutsu/AGENTS.md als Leitfaden für die Entwicklung und Wartung von Agents in diesem Projekt. Es definiert die Regeln und Prinzipien, die bei der Arbeit mit Agents zu beachten sind, insbesondere im Hinblick auf die Ableitung von Klassen und die Nutzung von Ressourcen.

Bevor Änderungen irgendwo anders im Repository vorgenommen werden, sind die relevanten Dateien in diesem Verzeichnis zu prüfen.

---

## Ableitungen & Vererbungen

Alle Dateien, die direkt oder indirekt von Dateien aus

```
packages/aherzog/hubjutsu
```

ableiten, müssen **zuerst in hubjutsu** geändert werden.

Achtung: `vendor/aherzog/hubjutsu` ist ein symlink zu `packages/aherzog/hubjutsu`. 
Änderungen müssen in `packages/aherzog/hubjutsu` erfolgen, damit sie korrekt reflektiert werden.

Reihenfolge der Änderungen:

1. Änderung in `packages/aherzog/hubjutsu` durchführen.
2. Danach abhängige Dateien aktualisieren oder neu generieren.

Direkte Änderungen in abgeleiteten Dateien sind nicht zulässig, wenn der Ursprung in `hubjutsu` liegt.

---

## Ausnahme: App-spezifische Änderungen

Nur wenn die Aufgabe explizit die Applikationsebene betrifft (z. B. Hinweise wie „in app/ bauen“, „in app/ implementieren“ oder klar abgegrenzte App-Anforderungen), dürfen Änderungen direkt in

```
app/
```

erfolgen.

In diesem Fall ist keine Anpassung in `hubjutsu` erforderlich – außer die Änderung betrifft gemeinsame Logik oder Core-Abstraktionen.

---

## Konfliktregel

Wenn unklar ist, ob eine Datei von `hubjutsu` ableitet, ist davon auszugehen, dass sie es tut.

Im Zweifel:

* Imports und Dependencies prüfen.
* Ursprung der Abstraktion nachverfolgen.
* Zuerst `hubjutsu` ändern.

---

## Prinzip

`hubjutsu` ist der kanonische Core.

Alles andere ist Implementierungsdetail.
