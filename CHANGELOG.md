# Changelog

All notable changes to [feelin](https://github.com/nikku/feelin) are documented here. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

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
