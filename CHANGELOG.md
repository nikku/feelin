# Changelog

All notable changes to [feelin](https://github.com/nikku/feelin) are documented here. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

* `DEPS`: update to `lezer-feel@2.0.0`

## 5.0.2

* `DEPS`: depend on `@lezer/common` instead of `@lezer/lr`

## 5.0.1

* `CHORE`: restore `main` export

## 5.0.0

* `FEAT`: turn into ESM only package ([#133](https://github.com/nikku/feelin/pull/133))
* `FIX`: make named function parameters minification safe ([#132](https://github.com/nikku/feelin/pull/132), [#14](https://github.com/nikku/feelin/issue/14))
* `FIX`: correct various named parameters for built-ins ([#132](https://github.com/nikku/feelin/pull/132))
* `DEPS`: explicitly depend on `min-dash@4.2.3` ([#134](https://github.com/nikku/feelin/pull/134))
* `DEPS`: update to `@lezer/lr@1.4.3`
* `DEPS`: update to `luxon@3.7.2`

### Breaking Changes

* Require `Node >= 20.12.0` to consume ESM module from CJS ([#133](https://github.com/nikku/feelin/pull/133))

## 4.6.0

* `FEAT`: implement `includes` function ([#123](https://github.com/nikku/feelin/pull/123))

## 4.5.0

* `FEAT`: add `round*` builtins ([#40](https://github.com/nikku/feelin/issues/40), [#79](https://github.com/nikku/feelin/pull/79))

## 4.4.0

* `FIX`: correct unary test handling of `null` and `boolean` values ([#117](https://github.com/nikku/feelin/pull/117), [#71](https://github.com/nikku/feelin/issues/71), [#115](https://github.com/nikku/feelin/issues/115))
* `DEPS`: update to `lezer-feel@1.9.0`

## 4.3.0

* `FEAT`: improve `date` and `time` input validation ([#102](https://github.com/nikku/feelin/pull/102))

## 4.2.0

* `FEAT`: support dependent evaluation inside `InExpressions` ([#101](https://github.com/nikku/feelin/pull/101))

## 4.1.0

* `FEAT`: support `!=` and `=` as unary test comparators ([nikku/lezer-feel#48](https://github.com/nikku/lezer-feel/pull/48))
* `FEAT`: support exponential notation for numbers ([nikku/lezer-feel#49](https://github.com/nikku/lezer-feel/pull/49))
* `DEPS`: update to `lezer-feel@1.6.0`

## 4.0.0

* `FEAT`: support `matches` built-in ([#22](https://github.com/nikku/feelin/issues/22), [#96](https://github.com/nikku/feelin/pull/96))
* `FEAT`: improve pattern parsing for `matches`, `replace`, and `split` built-ins ([#100](https://github.com/nikku/feelin/pull/100), [#96](https://github.com/nikku/feelin/pull/96))
* `FIX`: strictly parse regular expression flags ([#99](https://github.com/nikku/feelin/pull/99))
* `FIX`: correct parsing of `\r\n\t` special characters ([#97](https://github.com/nikku/feelin/pull/97))

### Breaking Changes

* Special characters `\r\n\t` are now parsed in accordance with the DMN specification ([#97](https://github.com/nikku/feelin/pull/97)).
* Flags not supported by the DMN specification are no longer accepted ([#99](https://github.com/nikku/feelin/pull/99)).

## 3.2.0

* `FEAT`: support passing parser dialect ([#86](https://github.com/nikku/feelin/issues/86))
* `DEPS`: update to `lezer-feel@1.4.0`

## 3.1.2

* `FIX`: correctly `get value` not returning falsy values ([#76](https://github.com/nikku/feelin/issues/76))
* `FIX`: correct addition of temporal and duration ([#56](https://github.com/nikku/feelin/issues/56))

## 3.1.1

* `FIX`: use bankers round for decimal ([#77](https://github.com/nikku/feelin/issues/77))
* `DEPS`: update to `lezer-feel@1.2.9`
* `DEPS`: update to `luxon@3.5.0`
* `DEPS`: update to `@lezer/lr@1.4.2`

## 3.1.0

* `FIX`: properly handle unary test against `0` ([#50](https://github.com/nikku/feelin/issues/50))
* `DEPS`: update to `luxon@3.4.0`
* `DEPS`: update to `lezer-feel@1.2.8`

## 3.0.1

* `FIX`: correct overriding of `date and time` and other built-ins ([#62](https://github.com/nikku/feelin/issues/62))
* `FIX`: correct list indexing with variables ([#59](https://github.com/nikku/feelin/issues/59))
* `DEPS`: update to `lezer-feel@1.2.5`

## 3.0.0

* `FEAT`: report parse errors as `SyntaxError`, exposing additional details

## 2.3.0

* `FEAT`: add duration ranges ([#47](https://github.com/nikku/feelin/pull/47))
* `FIX`: correct `floor` and `ceiling` scale + invalid argument handling ([`fe1d458`](https://github.com/nikku/feelin/commit/fe1d458a93493b6a8784eb466301cc02081ee1ec), [`c283cbe`](https://github.com/nikku/feelin/commit/c283cbeb66620d9a944f533b68455fe1893457ec))

## 2.2.0

* `FEAT`: add `list replace` built-in ([#41](https://github.com/nikku/feelin/pull/41))
* `FIX`: correct `time` arithmentics ([#43](https://github.com/nikku/feelin/pull/43))
* `FIX`: make `is` compare temporals strictly ([#43](https://github.com/nikku/feelin/pull/43))
* `FIX`: correct local temporal type handling in UTC timezone ([#43](https://github.com/nikku/feelin/pull/43))
* `FIX`: `string` serialize local time without offset ([#43](https://github.com/nikku/feelin/pull/43))
* `CHORE`: execute DMN TCK tests against CI

## 2.1.0

* `FEAT`: add `overlaps` built-in ([`0bf3020`](https://github.com/nikku/feelin/commit/0bf3020a721d6424ff957623f9c766ba9a01ea3c))
* `FEAT`: add `sort` built-in ([`1330a940`](https://github.com/nikku/feelin/commit/1330a940fb4316e944f8187d1587949e6a81dab7))
* `FEAT`: add `context merge` built-in ([`79e21f6a`](https://github.com/nikku/feelin/commit/79e21f6a1b3f0ff2b4d213fb5b183783d3381823))
* `FEAT`: add `context put` built-in ([`89dc1b79`](https://github.com/nikku/feelin/commit/89dc1b79e4c5af4f607111ae0367a432302e9c17))

## 2.0.0

* `FEAT`: add `string join` built-in ([#35](https://github.com/nikku/feelin/pull/35))
* `FEAT`: add `context` built-in ([`fcea4d6`](https://github.com/nikku/feelin/pull/38/commits/fcea4d6ce96a2c0c1520598505efade335ffad2d))
* `FEAT`: add `day of week`, `day of month`, `week of year` and `day of year` built-ins ([`d408ac5`](https://github.com/nikku/feelin/pull/38/commits/d408ac5317fff203b017787dddfc55b349c0b965))
* `FEAT`: support `number` built-in ([#19](https://github.com/nikku/feelin/issues/19))
* `FEAT`: guard functions against too many arguments ([#12](https://github.com/nikku/feelin/issues/12))
* `FEAT`: ensure named var-arg is a list ([`2be53bd`](https://github.com/nikku/feelin/pull/38/commits/2be53bd97c47b8e0f53781cdf7ea8e602c464afc))
* `FEAT`: support basic temporal arithmetics ([#16](https://github.com/nikku/feelin/issues/16), [#31](https://github.com/nikku/feelin/pull/31))

### Breaking Changes

* Variable argument functions must now declare variable parts via `...varArg` syntax ([`8f21960`](https://github.com/nikku/feelin/pull/38/commits/8f219609b34e8527d843db9c7120961eeba7c5fe)).

## 1.2.0

* `DEPS`: update to `lezer-feel@1.2.0`

## 1.1.0

* `FEAT`: support `distinct values` built-in ([#29](https://github.com/nikku/feelin/pull/29))
* `FEAT`: support `union` built-in ([#30](https://github.com/nikku/feelin/pull/30))
* `FEAT`: support temporal ranges ([#27](https://github.com/nikku/feelin/pull/27), [#15](https://github.com/nikku/feelin/issues/15))
* `FIX`: do not unbox path expression results on lists ([#28](https://github.com/nikku/feelin/pull/28))

## 1.0.1

* `FIX`: correctly name `cjs` export ([#26](https://github.com/nikku/feelin/pull/26), [#23](https://github.com/nikku/feelin/issues/23))
* `DEPS`: update to `lezer-feel@1.0.2`

## 1.0.0

* `FEAT`: parse single expression rather than expressions
* `FIX`: correct various spacing related evaluation bugs
* `DEPS`: update to `lezer-feel@1.0.0`

### Breaking Changes

* We now parse a single expression rather than a list of expressions.
  The result is the actual value, not a list of values.

## 0.45.0

* `FEAT`: return `null` on non-function invocations
* `DEPS`: update dependencies

## 0.44.1

* `FIX`: correct path extraction filtering null values

## 0.44.0

* `DEPS`: update to `lezer-feel@0.17.0`

## 0.43.1

* `FIX`: correctly handle comparison with `null` ([#20](https://github.com/nikku/feelin/issues/20))
* `FIX`: filter `null` values when path shorthand filtering ([#21](https://github.com/nikku/feelin/issues/21))
* `FIX`: correct parsing of `IfExpression` (required `else` block)
* `DEPS`: bump to `lezer-feel@0.16.1`

## 0.43.0

* `FEAT`: properly parse `List` shape
* `DEPS`: bump to `lezer-feel@0.16.0`

## 0.42.0

* `DEPS`: bump to `lezer-feel@0.15.0`

## 0.41.0

* `DEPS`: bump to `lezer-feel@0.13.0`

## 0.40.0

* `FEAT`: preserve context names
* `FIX`: safely stringify functions
* `FIX`: coerce path expression value to singleton
* `DEPS`: bump to `lezer-feel@0.12.1`

## 0.39.0

* `FEAT`: generate ES2015 bundle
* `DEPS`: update to `lezer-feel@0.11.1`

## 0.38.0

* `FEAT`: generate sourcemaps
* `DEPS`: update to `lezer-feel@0.11.0`

## 0.37.1

* `FIX`: coerce incompatible `InExpression` input to `null`

## 0.37.0

* `FEAT`: make `InExpressions` null-safe

## 0.36.0

* `FEAT`: add `+` string concatenation
* `FEAT`: support path on scalars (returning `null`)

## 0.35.2

* `FIX`: correct `is` argument handling

## 0.35.1

* `FIX`: actually parse that shit

## 0.35.0

* `FEAT`: parse unicode escape sequences ([#5](https://github.com/nikku/feelin/issues/5))
* `FIX`: correct `string` escaping

## 0.34.0

* `FIX`: parse positional arguments inside functions

## 0.33.0

* `FEAT`: support temporal functions ([#13](https://github.com/nikku/feelin/issues/13))
* `FEAT`: implement `string` for temporals
* `FEAT`: type cast built-ins
* `FIX`: do not unbox values in `ArithmeticException`
* `DEPS`: bump to `lezer-feel@0.9.1`

## 0.32.0

* `FEAT`: implement `range` type ([#6](https://github.com/nikku/feelin/issues/6), [#10](https://github.com/nikku/feelin/issues/10), [#11](https://github.com/nikku/feelin/issues/11))
* `FEAT`: implement first round of `range` builtins
* `FEAT`: implement `is` builtin

## 0.31.0

* `FEAT`: support tests in `ForExpression`
* `FEAT`: implement `stddev`
* `FEAT`: implement `mode`
* `FEAT`: implement `median`
* `FIX`: correct `log` invalid argument handling
* `FIX`: correct `odd` negative argument handling
* `FIX`: handle `modulo` invalid `divisor` argument
* `FIX`: correct `split` argument name
* `FIX`: correct `string` escaping behavior
* `FIX`: correct type + unboxing behavior in `ArithmenticExpression`
* `FIX`: correct `null` handling in `Conjunction` and `Disjunction`
* `FIX`: correct equality `null` handling

## 0.30.0

* `FEAT`: implement FEEL equality check
* `FIX`: correct filter on non lists
* `FIX`: correct various built-in issues (argument names, ...)
* `FIX`: annotate built-in list functions

## 0.29.0

* `FEAT`: support named function invocation ([#1](https://github.com/nikku/feelin/issues/1))

## 0.28.0

* `FEAT`: support `FunctionDefinition`
* `DEPS`: bump to `lezer-feel@0.8.8`

## 0.27.0

* `FEAT`: support context sensitive parsing
* `FEAT`: support incremental context definition
* `DEPS`: bump to `lezer-feel@0.8.0`

### Breaking Changes

* Simplified interpreter API: No more parsed context is returned

## 0.26.0

* `CHORE`: improve typings
* `DEPS`: bump to `lezer-feel@0.6.0`

## 0.25.0

* `CHORE`: add typings
* `DEPS`: bump to `lezer-feel@0.5`
* `DEPS`: bump to `lezer@1`

## 0.24.0

* `CHORE`: build upon `lezer-feel`

## ...

_Undocumented releases_
