# ugc-render

UMIGURI beatmap parsing, layout, Canvas rendering, and playback for [pgko](https://pgko.dev/). Framework independent, with no runtime dependencies. React controls and browser tests live in [apps/web](../../apps/web).

| Entry point           | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `ugc-render`          | Beatmap parsing, preparation, layout, and timing |
| `ugc-render/canvas`   | Canvas rendering                                 |
| `ugc-render/playback` | Audio transport                                  |
| `ugc-render/worker`   | Cancellable worker preparation                   |

Based on [MargreteOnline by inonote](https://github.com/inonote/MargreteOnline). Licensed under MIT; see [third-party notices](THIRD_PARTY_NOTICES.md).
