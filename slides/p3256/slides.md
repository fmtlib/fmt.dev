---
theme: default
title: Formatting what matters
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
    <div class="title-text">Formatting<br><code>what</code> matters</div>
    <img class="cpp-logo" :src="cppLogo" alt="C++">
  </div>
  <div class="title-details">
    <div><strong>P3256R0</strong></div>
    <div>Victor Zverovich</div>
    <div>SG16</div>
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

.title-text code {
  background: none;
  font-size: inherit;
  font-weight: inherit;
  padding: 0;
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

- Exception messages are commonly written to logs or diagnostic output, which
  currently requires calling `what()` explicitly.

- This paper proposes making `std::exception` and publicly derived exception
  types formattable with `std::format` and printable with `std::print`.

- It also specifies the encoding of library-generated parts of standard
  exception messages, resolving LWG4087.

---
layout: default
---

# Formatting exceptions today

Exception messages are formatted by calling `what()` explicitly:

```cpp
try {
  process_request();
} catch (const std::exception& e) {
  std::println(stderr, "Request failed: {}", e.what());
}
```

Unfortunately, this does not work reliably: the encoding of `what()` is
unspecified.

---
layout: default
---

# Mojibake on Windows

Example from LWG4087:

```cpp
std::uintmax_t size = 0;
try {
  size = std::filesystem::file_size(L"Шчучыншчына");
} catch (const std::exception& e) {
  std::println("Памылка: {}", e.what());
}
```

Output with UTF-8 literal encoding and Belarusian regional settings:

```text
Памылка: file_size: The system cannot find the file specified.: "�����������"
```

Microsoft STL implements `system_category().message()` using `FormatMessageA`
and first requests an en-US message. Since the English message is ASCII, only
the filesystem path exhibits mojibake.

---
layout: default
---

# Even worse with iostreams

```cpp
std::cout << "Памылка: " << e.what() << std::endl;
```

```text
╨Я╨░╨╝╤Л╨╗╨║╨░: file_size: The system cannot find the file specified.: "╪ўєў√э°ў√эр"
```

Now the string literal is garbled too.

The situation is somewhat better on macOS and most Linux systems, where UTF-8
has become the de facto standard.

---
layout: default
---

# With this proposal

`std::exception` is directly formattable and library-generated messages have a
consistent encoding:

```cpp
std::println("Памылка: {}", e);
std::println("Памылка: {}", e.what());
```

Both produce the correct output:

```text
Памылка: file_size: The system cannot find the file specified.: Шчучыншчына
```

The exact message format depends on the implementation.

---
layout: default
---

# Exception formatter

A `formatter` partial specialization for `std::exception` and types publicly
derived from it formats the string returned by the virtual `what()`:

```cpp
std::runtime_error e("connection refused");
auto s1 = std::format("{}", e);       // "connection refused"
auto s2 = std::format("{:>20}", e);   // "  connection refused"
auto s3 = std::format("{:?}", e);     // "\"connection refused\""
```

It uses the standard string format specification, providing the usual fill,
alignment, width, precision and debug formatting.

It is not opted into the nonlocking formatter optimization because `what()` is
virtual and can execute program-defined code.

The formatter has been implemented in {fmt}.

---
layout: default
---

# Encoding must be fixed at construction

- The runtime encoding of `what()` is currently unspecified, making portable
  interpretation and display impossible in general.

- The formatter cannot fix this: by the time it calls `what()`, differently
  encoded components may already have been combined into a single NTBS with no
  information about their source encodings.

- The message must instead be normalized when it is constructed.

---
layout: default
---

# Why the ordinary literal encoding?

- It is the only choice that makes library-generated messages directly
  composable with ordinary narrow strings on every implementation, fixing both
  direct and formatted output.

- It is consistent with `std::format` and `std::print`, whose narrow-character
  interfaces use the ordinary literal encoding.

- It matches how exception messages are formed: most are constructed from
  string literals or contain literal components.

- Unlike the C locale encoding, it does not change in response to `setlocale`
  while an exception object is alive, preventing bugs where a message is
  constructed under one C locale and interpreted under another.

---
layout: default
---

# Implementable with existing facilities

P2319 fixed filesystem path presentation problems by adding
`filesystem::path::display_string()`, which produces a string suitable for
formatting and printing in the ordinary literal encoding:

```cpp
std::filesystem::path p = L"Шчучыншчына";
std::println("{}", p.display_string());  // Шчучыншчына
```

No corresponding API converts a path to the C locale encoding.

---
layout: default
---

# Guarantees and scope

- Program-supplied `what_arg` bytes are preserved. If they use the ordinary
  literal encoding, the complete message does too; otherwise only the
  library-generated parts have that guarantee.

- Program-defined exception types remain responsible for their own encoding but
  now have a consistent standard-library model to follow.

- The formatter is provided only for `char` because `what()` returns a narrow
  string.

- A known, stable source encoding enables future formatting support for
  additional code unit types.

---
layout: default
---

# Specifying the encoding

- Library-generated parts of standard exception messages are in the ordinary
  literal encoding; program-supplied NTBSs are copied unchanged.

- `system_error` transcodes `code().message()` from the C locale encoding to the
  ordinary literal encoding during construction. The handling of
  unrepresentable characters is implementation-defined.

- `filesystem_error` incorporates each pathname as `p.display_string()`,
  evaluated during construction.

- `exception::what()` no longer says that the message may be an NTMBS suitable
  for conversion and display as a `wstring`.

- The encoding changes are intended to be applied as a defect report.

---
layout: default
---

# Proposal

Add a `formatter` for `std::exception` and publicly derived types:

```cpp
template<class T>
  requires derived_from<T, exception>
struct formatter<T, char> : formatter<const char*, char> {
  template<class FormatContext>
    constexpr typename FormatContext::iterator
      format(const T& e, FormatContext& ctx) const;
};
```

- Format the string returned by `what()`, with debug and constexpr support.
- Do not opt into the nonlocking formatter optimization.
- Specify the encoding of library-generated exception messages, resolving
  LWG4087 as a defect report.
- Add the feature-test macro `__cpp_lib_format_exception`.

<div class="paper-link">
Paper: <a href="https://wg21.link/P3256R0">https://wg21.link/P3256R0</a>
</div>
