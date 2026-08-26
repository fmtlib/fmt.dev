---
theme: default
title: Formatting Enums, Upon Reflection
author: Victor Zverovich
aspectRatio: 16/9
transition: fade
lineNumbers: false
drawings:
  persist: false
---

<script setup>
import cppLogo from './assets/cpp-logo.png'
</script>

<div class="title-slide">
  <div class="title-band">
    <div class="title-text">Formatting Enums,<br>Upon Reflection</div>
    <img class="cpp-logo" :src="cppLogo" alt="C++">
  </div>
  <div class="title-details">
    <div><strong>P4267R0</strong></div>
    <div>Victor Zverovich</div>
    <div>SG16 — August 26, 2026</div>
  </div>
</div>

<style>
.title-slide {
  background: white;
  inset: 0;
  position: absolute;
}

.title-band {
  align-items: flex-end;
  background: linear-gradient(115deg, #2b568f 0%, #0b213d 100%);
  display: flex;
  height: 64%;
  overflow: hidden;
  padding: 0 125px 72px;
  position: relative;
}

.title-text {
  -webkit-box-reflect: below 7px
    linear-gradient(to bottom, transparent 55%, #ffffff18);
  color: white;
  font-size: 48px;
  font-weight: 500;
  line-height: 1.15;
  position: relative;
  z-index: 1;
}

.cpp-logo {
  height: 245px;
  object-fit: contain;
  position: absolute;
  right: 95px;
  top: 42px;
  width: 245px;
}

.title-details {
  color: #111;
  font-size: 29px;
  line-height: 1.55;
  padding: 46px 120px;
}

</style>

---
layout: default
---

# Introduction

- Formatting an enumeration as its underlying type currently requires either
  a `formatter` specialization or an explicit conversion at every call site.

- P3070 proposed `format_as`, an ADL-based customization point that performs
  the conversion before type erasure.

- C++26 reflection and annotations now enable a more explicit opt-in
  mechanism without introducing a new ADL customization point.

- This paper supersedes P3070 and proposes annotation-based enum formatting,
  including formatting enumerators as strings.

---
layout: default
---

# Existing options

Formatting as the underlying type requires a custom formatter:

```cpp
enum class film {
  house_of_cards, american_beauty, se7en = 7
};

template <>
struct std::formatter<film> : std::formatter<int> {
  auto format(film f, std::format_context& ctx) const {
    return formatter<int>::format(std::to_underlying(f), ctx);
  }
};
```

or conversion at every call site:

```cpp
std::format("{}", std::to_underlying(film::se7en));
```

The first is verbose; the second is repetitive.

---
layout: default
---

# Problems with `format_as`

- **ADL claims a generic name.** An unrelated `format_as` function in an
  associated namespace can accidentally acquire formatting semantics.

- **ADL makes lookup nonlocal.** Associated entities of template arguments can
  add unrelated overloads, increasing compile time and diagnostic size.

- **Enums still need boilerplate.** The conversion to the underlying type is
  already defined by the language.

- **The general facility needs more design.** Interactions with existing
  customizations, constraints on the return type and exception specifications
  remain open.

```cpp
constexpr auto format_as(color c) {
  return std::to_underlying(c);  // unnecessary boilerplate
}
```

---
layout: default
---

# Formatting as the underlying type

Opt in directly on the enum definition:

```cpp
enum class [[=std::format_as_underlying]] color {
  red   = 1,
  green = 2,
  blue  = 4
};

std::format("{}", color::green);     // "2"
std::format("{:04x}", color::blue);  // "0004"
```

The enum is mapped as if `std::to_underlying` had been applied before passing
the argument to the formatting facility.

It can also be used where an integer argument is required.

---
layout: default
---

# Mapping is not formatter forwarding

Argument mapping changes the type stored in `basic_format_arg`:

```cpp
enum class [[=std::format_as_underlying]] width {
  small = 4,
  large = 20
};

std::format("{:{}}", "foo", width::large);
```

`width::large` is converted to an integer before `basic_format_arg` is
constructed, so it can supply a dynamic width.

A forwarding `formatter<width>` only controls how a value is rendered after
type erasure. It does not make `width` an integer formatting argument.

---
layout: default
---

# Mapping before type erasure

The mapped value is type-erased as its underlying type, avoiding a custom-type
handle and formatter dispatch.

Under this proposal, `std::byte` opts in using the same annotation:

```cpp
enum class [[=std::format_as_underlying]] byte : unsigned char {};

std::format("{}", std::byte{42});    // "42"
std::format("{:x}", std::byte{42});  // "2a"
```

The same mapping mechanism was approximately twice as fast in the P3070
benchmark:

<pre class="benchmark">Benchmark          Time       CPU
BM_Formatter       17.7 ns    17.7 ns
BM_FormatAs        8.90 ns    8.88 ns</pre>

---
layout: default
---

# Formatting as an identifier

Reflection enables string formatting without a hand-written lookup table:

```cpp
enum class [[=std::format_as_identifier]] color {
  red,
  green,
  blue
};

std::format("{}", color::green);  // "green"
```

The implementation uses:

```cpp
std::meta::enumerators_of(^^color)
std::meta::identifier_of(...)
```

Reflection removes the manually maintained conversion function, so adding an
enumerator cannot make formatting stale.

---
layout: default
---

# Identifier formatting semantics

**Aliases:** use the first enumerator with the matching value.

```cpp
enum class [[=std::format_as_identifier]] status {
  ok = 0,
  success = 0
};

std::format("{}", status::success);  // "ok"
```

**No matching enumerator:** format the underlying value in decimal.

```cpp
std::format("{:>5}", static_cast<color>(42));  // "   42"
```

Identifier formatting uses string format specifications. Integer presentation
types such as `x` are not accepted. The two annotations are mutually exclusive.

Underlying-type formatting supports both `char` and `wchar_t`. Identifier
formatting initially supports only `char` because `identifier_of` produces a
narrow string.

---
layout: default
---

# Why annotations?

- The opt-in is **local and explicit** on the declaration it affects.

- There is **no customization name in associated namespaces**, no overload set
  and no ADL.

- Declaration-level customization is already a motivating use case for C++26
  annotations.

- Reflection generates identifier-based formatting without code generation or
  manually maintained tables.

Prior art includes Rust `#[derive(Debug)]`, Elixir `@derive Inspect`, Groovy
`@ToString` and name-oriented versus numeric enum formatting in C#.

The identifier-based design has been implemented in {fmt}.

---
layout: default
---

# Lightweight opt-in header

Annotations appear on type declarations, often in widely included headers:

```cpp
#include <format_annotations>

enum class [[=std::format_as_underlying]] color {
  red,
  green,
  blue
};
```

Requiring `<format>` just to name the annotation would impose its compile-time
cost on translation units that do not format anything.

`<format_annotations>` contains only the annotation marker declarations. It
does not need to include `<format>` or `<meta>`, and `<format>` includes it.

---
layout: default
---

# Proposal

Add a lightweight `<format_annotations>` header containing:

```cpp
namespace std {

struct format_as_underlying_t {};
inline constexpr format_as_underlying_t format_as_underlying;

struct format_as_identifier_t {};
inline constexpr format_as_identifier_t format_as_identifier;

}
```

- Map underlying-annotated enums before normal format argument mapping.
- Add identifier formatting using C++26 reflection.
- Annotate `std::byte` with `format_as_underlying`.
- Keep the annotations mutually exclusive.

<div class="paper-link">
Paper: <a href="https://wg21.link/P4267R0">https://wg21.link/P4267R0</a>
</div>
