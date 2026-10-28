<template>
  <div class="slide-number">
    -- {{ $slidev.nav.currentPage }} of {{ $slidev.nav.total }} --
  </div>
</template>

<style>
.slide-number {
  bottom: 24px;
  color: #666;
  font-size: 14px;
  left: 0;
  position: fixed;
  text-align: center;
  width: 100%;
}

.slidev-layout h1 + p {
  opacity: 1 !important;
}
</style>
