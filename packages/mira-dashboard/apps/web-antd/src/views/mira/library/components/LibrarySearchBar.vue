<script setup lang="ts">
const searchQuery = defineModel<string>('searchQuery', { required: true });
const statusFilter = defineModel<string>('statusFilter', { required: true });
</script>

<template>
  <div class="mb-6 flex gap-4">
    <div class="relative">
      <div
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索资源库..."
        class="block w-64 rounded-md border border-gray-300 py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <select
      v-model="statusFilter"
      class="block w-32 rounded-md border border-gray-300 px-3 py-2 leading-5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">全部状态</option>
      <option value="active">活跃</option>
      <option value="inactive">未活跃</option>
    </select>
  </div>
</template>
