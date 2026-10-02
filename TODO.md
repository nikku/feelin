# TODO

## Performance: filter expression regression (+11.9%)

The `filter expression` benchmark is ~12% slower on the `nikku-improve-warning-messages` branch compared to `main`. The likely cause is the new `FeelFunction.invoke` dispatch path — filters run per-element, so the signature matching and validation overhead is amplified.

**Possible optimization:** When a `FeelFunction` has only a single compiled signature, skip the signature iteration and dispatch directly to that signature's validator.

**Benchmark:** `[1, 2, 3, 4, 5][item > 2]` — 147.39 µs/op (branch) vs 131.75 µs/op (main).
