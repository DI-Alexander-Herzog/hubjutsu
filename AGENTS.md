Dieses Projekt nutzt ein Class Override System in der Stubs im App-Folder die Lib-Folder überschreiben.

Es ist ein Submodule / Paket für andere Laravel Projekte mit Inertia und React.

# App-over-Lib (PHP)
In app/ liegende Klassen überschreiben gleichnamige Klassen diesem Paket.

Das heißt, auch in diesem Projekt müssen Klassen aus app/ verwendet werden, um die Ableitung sicherzustellen.

Beispiele: Nutze namespace App\Models\... andstelle von \AHerzog\Hubjutsu\Models\... 

Selbe gilt zumidnest für  App\Http\Controllers zu \AHerzog\Hubjutsu\Http\Controllers usw.

Daher überall in diesem Paket immer zuerst auf App\... Namespace verweisen, außer natürlich es ist die Klasse selbst.

Importiere Modelle in der Lib immer über App\Models\... und nicht über ein Hubjutsu\...-Namespace.

Bei jeder Referenzierung immer zuerst die Klasse aus app/ verwenden. Nur wenn dort keine Klasse existiert, darf auf lib/ zurückgegriffen werden.

Namespaces in der PHP-Lib

# App-over-lib (react/type script)

Hier gilt äjhnliches wi ein PHP.

Es gibt für jeden Componentn einen passendne Re-Export im @.

```json
    "paths": {
            "@/*": ["./resources/js/*"],
            "@hubjutsu/*": ["./vendor/aherzog/hubjutsu/resources/js/*"],
        }
```        

Sprich, immer zuerst den @/* Pfad verwenden, um auf eigene Komponenten zuzugreifen und nicht die @hubjutsu/* versionen


Keine Importpfade aus dem hubjutsu-Namespace nutzen.