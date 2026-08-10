<script setup lang="ts">
import type { CollapsibleTriggerProps } from "reka-ui"
import { CollapsibleTrigger } from "reka-ui"

const props = defineProps<CollapsibleTriggerProps>()
</script>

<template>
  <CollapsibleTrigger data-slot="collapsible-trigger" v-bind="props">
    <slot />
  </CollapsibleTrigger>
</template>

<style scoped>
[data-slot="collapsible-trigger"] {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--primary, oklch(0.55 0.2 260));
  border-radius: 0.75rem 0.75rem 0.25rem 0.25rem;
  background: var(--primary);
  color: var(--primary-foreground);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

[data-slot="collapsible-trigger"]:hover {
  filter: brightness(0.95);
}

[data-slot="collapsible-trigger"] :deep(*) {
  color: inherit;
}
</style>
