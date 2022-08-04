# Changelog

All notable changes to [feelin](https://github.com/nikku/feelin) are documented here. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

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
