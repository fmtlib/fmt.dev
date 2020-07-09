<pre class='metadata'>
Title: Formatting for std::complex
Shortname: d?
Revision: 0
Audience: LEWG
Status: WD
Group: WG21
URL: http://wg21.link/?
Editor: Michael Tesch, tesch1@gmail.com
Abstract:
  This paper discusses extending coverage of the formatting
  functionality of [[P0645]] to std::complex.
Date: 2019-12-22
Markup Shorthands: markdown yes
</pre>

Introduction {#introduction}
============

[[P0645]] has proposed a text formatting facility that provides a safe
and extensible alternative to the `printf` family of functions. This
paper explores how to format complex numbers from `std::complex`.

* [[#motivation|Motivation]]
* [[#performance|Performance]]
* [[#design-considerations|Design Considerations]]
* [[#backwards-compat|Backwards Compatibility]]
* [[#questions|Questions]]
* [[#acknowledgements|Acknowledgements]]
* [[#references|References]]

Motivation {#motivation}
==========

This is a proposal defining formatting for complex nunmbers
represented by the library type `std::complex`.  The default notation
`(3+4i)` is proposed, as it is common in mathematics, the physical
sciences, and many other popular mathematical software environments.
This form is also (more) consistent with STL literals for
`std::complex` [[N3660]].  In addition to defining the new format and
discussing design choices, this proposal attempts to address questions
arounding introducing a format which differs from the existing
`iostream` format, and why the aforementioned advantages outweigh the
disadvantages of introducing a potentially incompatible format.

The formatting of `std::complex` should be simple, consistent with
existing conventions of `<format>`, and conveniently support the most
common use cases of `std::complex`.  As the first (I believe?) nested
format specified for `<format>`, it can also serve as an example for
how format nesting can be done.

Mathematics generally follows the convention that complex numbers
consist of a real part and an orthogonal imaginary part which is
identified by multiplication of the imaginary unit vector \$ i \$.
Extending the set of unit vectors in this way furthermore implies
straightforward extensions to other useful algebras such as
quaternions \$ i, j, k\$, dual numbers \$ \epsilon \$, etc...

For the types `std::complex<{float,double,long double}>`, C++14
introduced string literals to the standard library in the namespace
`std::literals::complex_literals`.  These string literals acknowledge
the common use cases of these types and provide a convenient way to
write complex numbers in code, for example the number \$ 1 + 1i \$
can be written in code as as `(1+1if)`, `(1+1i)`, or `(1+1il)`,
depending on the desired underlying type.

Sometimes it is possible to omit one part in a sybolic representation
yet retain bijectivity in the machine representation to symbolic
mapping.  For example, the complex number \$ 0 + 0i \$ can be
unambiguously written as either `0` or `0i`.  The convention of
mathematics is the former, although the latter has the advantage of
implying the underlying field.

As specified \ref?, the existing iostreams formatting of a complex
number `c` is essentially `os << '(' << real(c) << ',' << imag(c) <<
')';`.  This embedded comma can cause silent unexpected generation of
ambiguous output, which can happen in the above, ie, when the locale's
decimal separator is set to comma.  This ambiguity does not exist in
the imaginary unit notation, even when an unusual locale is used.

Design Considerations {#design-considerations}
=====================

With an eye to entirely replacing the functionality of iostreams, the
following considerations are made:

## Numeric form

The question of how to represent the numeric type `T` of
`std::complex<T>` is simply delegated to the `formatter<T>` for that
type.  Special alignment, fill, and sign rules may apply for `T` $`
\in `$ {`float`, `double`, `long double`}, but other custom value
types are accomodated.  This is done by optionally forwarding a
designated portion of the `formatter<std::complex<T>>` format spec to
`formatter<T>`.

Although the standard does not specify behavior of `std::complex<T>`
for types other than `float`, `double`, `long double`, it is not
uncommon to use a type for `T` which provides functionality such as
extended precision or automatic differentiation.  The formatting
specification should therefore be recursive, so that arbitrary
numerical types for `T` are properly formatted.

## Imaginary unit

As previously mentioned, mathematics notation typically uses *i* as
the complex unit vector, however it is very common in electrical
engineering to use *j* instead.  Mathematica uses the unicode
character ? for the imaginary unit.  Another common written form of
complex numbers puts the imaginary unit in front of the imaginary part
rather than after it.  Julia uses the dual-character symbol `im`, and
it it easy to imagine wanting to explicitly specify the
usually-omitted implied real unit-vector, result in a format like
`3re + 4im`.  Supporting these use cases would be nice, but not with
significant implementation difficulty.

## Omission of a part

Because the complex number is always a pair of real part and imaginary
part, it is not necessary to print both parts if one of the parts is
identical to a known quantity: typically (positive!) zero; in this
case omission implies the value uniquely.  Either the real or the
imaginary part can be omitted when this condition is satisfied,
although clearly not both.

Should a part be dropped?

The benefits of part dropping include: shorter conversions in the
special but common cases of purely real or imaginary numbers,
adherence to common notation.  There is also a tie-in with the design
consideration discussed below of whether surrounding parenthesis are
necessary: a single numeric value does not need to be surrounded by
parenthesis in order to recognize it as the value for an entire
complex number.

What are the conditions under which a part can be dropped?

A simple comparison with zero is usually insufficient to decide
whether a part can be omitted.  While C++ does not specify the
underlying floating-point format, for correct round-trip conversions,
the omitted part must be binary equivalent to `T(0)`.  The function
`std::signbit<T>` is used to distinguish between `-0` and `0`, so the
type `T` must have both a defined `std::formatter<T>` and
`std::signbit<T>` to distinguish the two cases.

This nuance is demonstrated by the result of `sqrt(-1. + 0i)` vs
`sqrt(-1. - 0i)`.

Which part should be dropped?

Either part of an imaginary number could be dropped if it is binary
equal to `T(0)`, but in the special case of \$ 0 + 0i \$ dropping both
parts would lead to the absurdity of an empty string.  This is an open
question, but it is the opinion of the author that the real part
should be dropped, so that the remaining symbolic representation
retains the imaginary unit vector, indicating use of the complex field
\$ \frac{C} \$.

Parentheses
===========

Should parentheses be mandatory?

Are parentheses always neccesary to unambiguously specify a complex
number?

Do mandatory parentheses significantly improve ease or speed of
complex number parsing?

If parentheses are not mandatory, when should they be omitted?

Backwards Compatibility {#backwards-compat}
=======================

To maintain backward compatibility we propose an easy-to-use format
specifier that exactly reproduces the legacy iostreams output format.

The `ios` specifiers that affect complex number output are `precision`
and `width`, these can not be easily guessed, but can be specified
manually in the nested format specifier.  Otherwise the compatibilty
format the output will produce roughly the same output (modulo locale
and default format for `formatter<T>`) that iostreams produces.

Parsing
=======

This paper does not address parsing (scan'ing) for the type
`std::complex<T>` but does aim to produce formatted output that can be
unambiguously round-trip formatted and parsed.

Survey of other languages
=========================

The following programming languages/environments similarly use the
imaginary-unit notation as their default: python, julia, R, matlab,
mathematica, go.  IF you know the type of the data, these languages
offer round-trip conversion from complex -> text -> complex, but
because some of them drop the complex part in their textual output
when the complex part is zero (or even negative zero!) some arguably
pertinent information can be lost during formatting.

<table>
<tbody>
<tr><td>language <td> basic format <td> result of sqrt(-1) <td> result of sqrt(-1)-sqrt(-1)
<thead>
<tr><td>[C++ iostreams](https://en.cppreference.com/w/cpp/numeric/complex/operator_ltltgtgt)
 <td> `(3,4)` <td> `(0,1)` <td> `(0,0)`
<tr><td>[numpy](https://docs.scipy.org/doc/numpy/reference/generated/numpy.imag.html)
 <td> `(3+4j)` <td> `1j` <td> `0j`
<tr><td>[julia](https://docs.julialang.org/en/v1/manual/complex-and-rational-numbers/)
 <td> `3.0 + 4.0im` <td> `0.0 + 1.0im` <td> `0.0 + 0.0im`
<tr><td>[octave](https://octave.org/doc/v4.4.1/Complex-Arithmetic.html)
 <td> `3 + 4i` <td> `0 + 1i` <td> `0`
<tr><td>[mathematica*](https://reference.wolfram.com/language/ref/I.html)
 <td> `1+`*i* <td> *i* <td> `0`
<tr><td>[R](http://www.r-tutor.com/r-introduction/basic-data-types/complex)
 <td> `(3+4i)` <td> `(0+1i)` <td> `(0+0i)`
<tr><td>[c++14 literals,float](https://en.cppreference.com/w/cpp/numeric/complex/operator%22%22i)
<td> `3+4if` <td> `1if` <td> `0if`
<tr><td>[go](https://golang.org/pkg/fmt/)
<td> `(3+4i)` <td> `(0+1i)` <td> `(0+0i)`
</table>

`*` - checked via wolframalpha

OCaml

Haskell `a :+ b`, this choice does not need much commentary, this much
is offered: it is quite unique.

c# (does not, but the doc page for complex includes (only) example
code for creating an appropriate fomatter)

Wish List {#wish-list}
=========

Feature wish list:

- nested specification of real and imaginary parts via `formatter<T>`
- easy substitution of "old style" iostreams format with simply `{:,}`
- defineable symbol for imaginary unit (`j`, `im`)
- option to prefix the imaginary part with the imaginary unit
- control over which (real/imag) part omission (`0` or `0j`)
- default to minimalist unique parseable format: `1`, `1i`, `0j`, `(1+1i)`
- toggle to turn off surrounding parens: `1+1i`
- toggle to turn off outputting `-` on negative zero (personal pet
    peeve when writing math stuff where there is only one zero)
- center alignment `^` aligns output around the connecting `+/-`
- option for polar formatted output, ie `(1.41421*exp(i*3.14159))`
  
Examples {#examples}
========

Proposed Wording {#proposed-wording}
================

Questions {#questions}
=========

**Q1**: Do we want any of this?

**Q2**: The strategy of this paper is to include a laundry list of
        possibilities, which parts do we want?

# Acknowledgements {#acknowledgements}

# References {#references}

