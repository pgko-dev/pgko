# @pgko.dev/env

Valibot schemas and parsing helpers for environment variables.

## Usage

```sh
bun add @pgko.dev/env valibot
```

```ts
import { ClientEnvironmentSchema } from "@pgko.dev/env/client";
import * as v from "valibot";

const environment = v.parse(ClientEnvironmentSchema, {
  PUBLIC_API_URL: "https://api.pgko.dev",
});
```

Import generic helpers from `@pgko.dev/env/common`; the package has no root entry point.

See [environment parsing](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#env) and [workspace development](https://github.com/pgko-dev/pgko/blob/main/docs/development.md).

[MIT license](LICENSE).
