<script setup lang="ts">
import { ArrowDown, ArrowUp, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { ExpandableButton } from '@renderer/components/common'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DateFilter, SortDirection, SortKey, TypeFilter, ViewMode } from './localFolderUtils'

defineProps<{
  itemCount: number
}>()

const searchQuery = defineModel<string>('searchQuery', { default: '' })
const typeFilter = defineModel<TypeFilter>('typeFilter', { default: 'all' })
const dateFilter = defineModel<DateFilter>('dateFilter', { default: 'all' })
const sortKey = defineModel<SortKey>('sortKey', { default: 'name' })
const sortDirection = defineModel<SortDirection>('sortDirection', { default: 'asc' })
const viewMode = defineModel<ViewMode>('viewMode', { default: 'list' })
const gridItemSize = defineModel<number>('gridItemSize', { default: 112 })
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
    <ExpandableButton
      icon="search"
      :expand-tooltip="$t('views.localFolder.searchPlaceholder')"
      :collapse-tooltip="$t('common.close')"
      class="shrink-0"
    >
      <InputGroup class="w-64">
        <InputGroupAddon>
          <span class="material-icons text-sm">search</span>
        </InputGroupAddon>
        <InputGroupInput
          v-model="searchQuery"
          :placeholder="$t('views.localFolder.searchPlaceholder')"
        />
        <InputGroupButton
          v-if="searchQuery"
          :title="$t('views.localFolder.clearSearch')"
          @click="searchQuery = ''"
        >
          <X class="size-3.5" />
        </InputGroupButton>
      </InputGroup>
    </ExpandableButton>

    <Select v-model="typeFilter">
      <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.typeFilter')">
        <SelectValue :placeholder="$t('views.localFolder.typeFilter')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{{ $t('views.localFolder.filterAll') }}</SelectItem>
        <SelectItem value="folder">{{ $t('views.localFolder.filterFolders') }}</SelectItem>
        <SelectItem value="image">{{ $t('views.localFolder.filterImages') }}</SelectItem>
        <SelectItem value="video">{{ $t('views.localFolder.filterVideos') }}</SelectItem>
        <SelectItem value="audio">{{ $t('views.localFolder.filterAudio') }}</SelectItem>
        <SelectItem value="document">{{ $t('views.localFolder.filterDocuments') }}</SelectItem>
        <SelectItem value="archive">{{ $t('views.localFolder.filterArchives') }}</SelectItem>
        <SelectItem value="other">{{ $t('views.localFolder.filterOther') }}</SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="dateFilter">
      <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.dateFilter')">
        <SelectValue :placeholder="$t('views.localFolder.dateFilter')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{{ $t('views.localFolder.dateAll') }}</SelectItem>
        <SelectItem value="today">{{ $t('views.localFolder.dateToday') }}</SelectItem>
        <SelectItem value="week">{{ $t('views.localFolder.dateWeek') }}</SelectItem>
        <SelectItem value="month">{{ $t('views.localFolder.dateMonth') }}</SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="sortKey">
      <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.sortBy')">
        <SelectValue :placeholder="$t('views.localFolder.sortBy')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">{{ $t('views.localFolder.sortName') }}</SelectItem>
        <SelectItem value="modifiedAt">{{ $t('views.localFolder.sortModified') }}</SelectItem>
        <SelectItem value="size">{{ $t('views.localFolder.sortSize') }}</SelectItem>
        <SelectItem value="type">{{ $t('views.localFolder.sortType') }}</SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="viewMode">
      <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.viewMode')">
        <SelectValue :placeholder="$t('views.localFolder.viewMode')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="list">{{ $t('views.localFolder.listView') }}</SelectItem>
        <SelectItem value="grid">{{ $t('views.localFolder.gridView') }}</SelectItem>
        <SelectItem value="columns">{{ $t('views.localFolder.columnsView') }}</SelectItem>
        <SelectItem value="gallery">{{ $t('views.localFolder.galleryView') }}</SelectItem>
      </SelectContent>
    </Select>

    <div v-if="viewMode === 'grid'" class="flex min-w-36 items-center gap-2" :title="$t('views.localFolder.gridSize')">
      <Slider
        :model-value="[gridItemSize]"
        :min="96"
        :max="240"
        :step="8"
        class="w-28"
        :aria-label="$t('views.localFolder.gridSize')"
        @update:model-value="value => { gridItemSize = value?.[0] ?? gridItemSize }"
      />
      <span class="w-10 text-right text-xs text-muted-foreground">{{ gridItemSize }}px</span>
    </div>

    <Button
      variant="outline"
      size="icon-sm"
      :title="sortDirection === 'asc' ? $t('views.localFolder.sortAscending') : $t('views.localFolder.sortDescending')"
      @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
    >
      <ArrowUp v-if="sortDirection === 'asc'" />
      <ArrowDown v-else />
    </Button>

    <span class="ml-auto text-xs text-muted-foreground">{{ $t('views.localFolder.itemCount', { count: itemCount }) }}</span>
  </div>
</template>
