<script setup lang="ts">
defineProps<{ variant?: 'default' | 'outline' | 'ghost' | 'danger'; size?: 'sm' | 'md' }>();
</script>
<template>
  <button class="btn" :class="[variant ?? 'default', size ?? 'md']">
    <slot />
  </button>
</template>
<style scoped>
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid var(--border); border-radius: var(--radius);
  cursor: pointer; font: inherit; transition: background .15s;
  background: var(--bg-elev); color: var(--fg);
}
.btn.default { background: var(--primary); color: var(--primary-fg); border-color: var(--primary); }
.btn.outline { background: transparent; }
.btn.ghost { background: transparent; border-color: transparent; }
.btn.danger { background: var(--danger); color: #fff; border-color: var(--danger); }
.btn.sm { padding: 4px 8px; font-size: 12px; }
.btn.md { padding: 6px 12px; }
.btn:hover { opacity: .85; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
