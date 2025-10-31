# Very short description of the package

This is the main Setup-Guide for Laravel Projects at alexander-herzog.at.

## Installation

### 1. Initial commit im Zielprojekt

```bash
git commit --allow-empty -n -m "Initial commit."
```

### 2. Submodule hinzufügen

**Lokal (mit SSH):**

```bash
git submodule add git@github.com:DI-Alexander-Herzog/hubjutsu.git packages/aherzog/hubjutsu
```

**Server (ohne SSH-Key, nur HTTPS):**

```bash
git submodule add https://github.com/DI-Alexander-Herzog/hubjutsu.git packages/aherzog/hubjutsu
```

Falls das Submodule schon existiert und auf dem Server umgestellt werden muss:

```bash
git config submodule.packages/aherzog/hubjutsu.url "https://github.com/DI-Alexander-Herzog/hubjutsu.git"
git config -f .gitmodules submodule.packages/aherzog/hubjutsu.url "https://github.com/DI-Alexander-Herzog/hubjutsu.git"
git submodule sync packages/aherzog/hubjutsu
```

wenns echt weiter klemmt, dann direkt den Remote-URL des Submodules ändern:
```bash
cd packages/aherzog/hubjutsu
git remote set-url origin https://github.com/DI-Alexander-Herzog/hubjutsu.git
cd ../..
git submodule update --init --recursive
```

### 3. Composer einbinden

```bash
composer config repositories.aherzog/hubjutsu -j '{"type":"path","url":"./packages/aherzog/hubjutsu","options":{"symlink":true}}'
composer require "aherzog/hubjutsu @dev"
php artisan hubjutsu:setup
```

## Push/Pull Submodule

In das Submodule wechseln und direkt Git-Befehle ausführen.

Empfohlene Einstellung:

```bash
git config push.recurseSubmodules on-demand
```

Alle Submodules committen & pushen:

```bash
git submodule foreach "git add . && git commit -m 'update' && git push"
```

## Usage


   * Klassen aus `app/` überschreiben gleichnamige Klassen in `lib/`.
   * In der PHP-Lib immer `App\Models\…` importieren, nicht `Hubjutsu\…`.
   * In React/TypeScript nur Komponenten via `@/Components/...` importieren.

## Testing

```bash
composer test
```

## Changelog

See [CHANGELOG](CHANGELOG.md).

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md).

## Security

Report security issues to [alexander@alexander-herzog.at](mailto:alexander@alexander-herzog.at).

## Credits

* [Alexander Herzog](https://github.com/aherzog)

## License

MIT – see [LICENSE.md](LICENSE.md).
