# @pgko.dev/tsconfig

Shared TypeScript configurations for validation, package builds, and React projects.

## Usage

```sh
bun add --dev @pgko.dev/tsconfig typescript
```

```json
{
  "extends": "@pgko.dev/tsconfig/base.json",
  "include": ["src"]
}
```

Use `react-library.json` for React and DOM types, and `build.json` alongside the base configuration for package output.

See [configuration notes](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#tsconfig) and [workspace development](https://github.com/pgko-dev/pgko/blob/main/docs/development.md).

[MIT license](LICENSE).
