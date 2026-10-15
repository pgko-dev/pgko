# @pgko.dev/schema

Shared Valibot validation schemas and API models.

## Usage

```sh
bun add @pgko.dev/schema valibot i18next
```

```ts
import * as v from "valibot";

import { EmailSchema } from "@pgko.dev/schema";

const result = v.safeParse(EmailSchema, "user@example.com");
```

See [schemas and translated validation](https://github.com/pgko-dev/pgko/blob/main/docs/packages.md#schema) and [workspace development](https://github.com/pgko-dev/pgko/blob/main/docs/development.md).

[MIT license](LICENSE).
