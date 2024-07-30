## Bestforming-Admin
Dieses Repo dient als Admin-Panel für die Bestforming/EOKapp

Die App selbst ist in einem anderen Repo zu finden.

## Installation
1. Clone das Repo
2. Installiere die Dependencies mit `composer install`
3. Kopiere die `.env.example` Datei und benenne sie in `.env` um und fülle die Datenbank Informationen aus
4. Generiere einen neuen Key mit `php artisan key:generate`
5. Installiere die NPM Dependencies mit `npm install`
6. Führe die Migrationen aus mit `php artisan migrate`

## Starten
Je nach Setup einen Webserver starten.

Details dazu findest du unter: https://laravel.com/docs/11.x/installation


## Änderungen
Wenn du Änderungen an den JS oder CSS Dateien vornimmst, musst du diese kompilieren.

`npm run build`

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
