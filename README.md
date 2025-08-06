# Very short description of the package

This is the main Setup-Guide for Laravel Projects at alexander-herzog.at


## Installation

Most of the time, you will want to use git subtree to install this package as you might want to change stuff directly in the project and we don't want to provide our package to customers via github public repo and we defenately don't want to handel multipe git repo accesses...

Make sure you did at least an empty commit in the current project
```bash
git commit --allow-empty -n -m "Initial commit."
```

```bash
git submodule add git@github.com:DI-Alexander-Herzog/hubjutsu.git packages/aherzog/hubjutsu
```
this will fetch into the packages directory which is used most of the time for local Laravel Package Development.

Add the repository to your composer.json
```bash
composer config repositories.aherzog/hubjutsu  -j '{"type":"path","url":"./packages/aherzog/hubjutsu","options":{"symlink":true}}'

composer require "aherzog/hubjutsu @dev"

php artisan hubjutsu:setup

```

## Push/Pull submodule
in den Ordner wechseln und git command direkt absetzten.
```bash
git config push.recurseSubmodules on-demand

git submodule foreach "git add . && git commit -m 'update' && git push"
```

## Usage

```php
// Usage description here
```

### Testing

```bash
composer test
```

### Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

### Security

If you discover any security related issues, please email alexander@alexander-herzog.at instead of using the issue tracker.

## Credits

-   [Alexander Herzog](https://github.com/aherzog)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

## Laravel Package Boilerplate

This package was generated using the [Laravel Package Boilerplate](https://laravelpackageboilerplate.com).
