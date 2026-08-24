<template>
  <div ref="mediaTabListViewRef"
    class="media-list-view flex-1 flex flex-col w-full bg-transparent overflow-hidden relative h-full text-[13px]"
    @keydown.capture="handleDeleteKeyDown" @dragover.prevent="canUpload && handleDragOver($event)"
    @dragleave.prevent="canUpload && handleDragLeave($event)" @drop.prevent="canUpload && handleDrop($event)">
    <!-- 拖拽上传覆盖层 -->
    <Transition name="fade">
      <div v-if="isDragOver && canUpload"
        class="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
        <div class="text-center">
          <span class="material-icons text-5xl text-primary mb-2">cloud_upload</span>
          <p class="text-primary font-medium text-lg">{{ $t('tabs.mediaTabListView.releaseToUpload') }}</p>
        </div>
      </div>
    </Transition>

    <!-- 顶部筛选栏和工具按钮 -->
    <div class="flex space-x-3 " style="align-items: baseline">
      <div class="flex-1 min-w-0">
        <FilterBar :filters="filterRules" :is-all-selected="isAllSelected" :folder-tree-items="folderTreeItems"
          :tag-tree-items="tagTreeItems" :sort="sortField" :order="sortOrder" @select-all="handleSelectAll"
          @filter-change="handleFilterChange" @filter-clear="handleFilterClear" @sort-change="handleSortChange"
          @apply-saved-filter="handleApplySavedFilter" @clear-filters="handleClearAllFilters"
          :applied-filter-id="appliedFilterId" />
      </div>
      <div class="flex-shrink-0 flex items-center space-x-2">
        <!-- 更多操作下拉菜单：视图切换 + 刷新 -->
        <Dropdown :offset="{ x: 0, y: 4 }" placement="bottom-end" min-width="120px">
          <template #trigger>
            <button
              class="flex items-center rounded-lg border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur shadow-sm hover:bg-white/60 dark:hover:bg-muted transition-colors"
              :title="$t('tabs.mediaTabListView.moreActions')" style="padding: 6px;">
              <span class="material-icons text-sm text-muted-foreground dark:text-muted-foreground">more_vert</span>
            </button>
          </template>

          <template #content="{ close }">
            <div class="py-1">
              <button v-for="mode in viewModes" :key="mode.value" :class="[
                'w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 transition-colors',
                viewMode === mode.value ? 'bg-primary/10 text-primary' : 'text-foreground dark:text-muted-foreground'
              ]" @click="handleViewModeChange(mode.value as 'grid' | 'list' | 'waterfall'); close()">
                <span class="material-icons text-sm">{{ mode.icon }}</span>
                <span>{{ mode.label }}</span>
                <span v-if="viewMode === mode.value" class="material-icons text-sm ml-auto text-primary">
                  check
                </span>
              </button>
              <div class="my-1 border-t border-border dark:border-border"></div>
              <button
                class="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 text-foreground dark:text-muted-foreground transition-colors"
                @click="handleManualRefresh(); close()">
                <span class="material-icons text-sm" :class="{ 'animate-spin': isLoading }">refresh</span>
                <span>{{ $t('tabs.mediaTabListView.refreshData') }}</span>
              </button>
              <button
                class="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 text-foreground dark:text-muted-foreground transition-colors"
                @click="sectionLayoutDialogOpen = true; close()">
                <span class="material-icons text-sm">dashboard_customize</span>
                <span>{{ $t('tabs.mediaTabListView.customizeSections') }}</span>
              </button>
            </div>
          </template>
        </Dropdown>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden relative">
      <div class="flex-1 flex flex-col min-w-0 min-h-0">
        <!-- 媒体内容 - files 和 trash 都使用统一的视图 -->
        <div class="flex-1 min-h-0 overflow-y-auto w-full min-w-0" @wheel="handleCtrlWheel">
          <OrderedSectionList :items="enabledSections" headerless>
            <template #default="{ item: section }">
              <!-- 顶部的子文件夹 -->
              <section v-if="section.id === 'folders'">
                <header class="flex items-center justify-between px-5 pt-3 pb-1">
                  <h3 class="text-sm font-medium text-foreground">{{ $t('views.sidebarModuleList.folders') }}</h3>
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{
                      childFolderItems.length }}</span>
                    <button
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      :title="$t('views.sidebarModuleList.addFolder')" @click="showFolderDialog = true"><span
                        class="material-icons text-base leading-none">add</span></button>
                  </div>
                </header>
                <div v-if="childFolderItems.length > 0">
                  <div ref="folderGridRef" class="folder-card-grid"
                    :style="{ '--folder-grid-item-size': `${folderGridItemSize}px` }">
                    <FolderContextMenu v-for="item in visibleChildFolderItems" :key="String(item.raw.id)"
                      :folder="item.raw as any" :folders="availableFolders as any" @refresh="handleRefresh(true)">
                      <div class="folder-card-button" role="button" tabindex="0" :title="item.label"
                        @click="handleChildFolderSelect(item.raw, $event)"
                        @keydown.enter.prevent="handleChildFolderSelect(item.raw, $event)"
                        @keydown.space.prevent="handleChildFolderSelect(item.raw, $event)"
                        @dragover.prevent.stop="canUpload && handleFolderCardDragOver($event)"
                        @dragleave.prevent.stop="canUpload && handleFolderCardDragLeave($event)"
                        @drop.prevent.stop="canUpload && handleDrop($event, String(item.raw.id))">
                        <Folder :size="folderCardUiSize" :label="item.label" :badge="item.count ?? 0"
                          :thumbnail="folderCoverUrls[String(item.raw.id)]"
                          :custom-color="getFolderColor(item.raw.color)" />
                      </div>
                    </FolderContextMenu>
                    <!-- 超过两行时的展开/收起占位卡片 -->
                    <button v-if="folderGridOverflow" type="button"
                      class="flex flex-col items-center justify-center gap-1 rounded-3xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                      :style="{ width: `${folderGridItemSize}px`, height: `${folderGridItemSize}px` }"
                      :title="folderCollapsed
                        ? $t('tabs.mediaTabListView.expandFolders', { count: folderHiddenCount })
                        : $t('tabs.mediaTabListView.collapseFolders')"
                      @click="folderCollapsed = !folderCollapsed">
                      <span class="material-icons text-2xl">{{ folderCollapsed ? 'expand_more' : 'expand_less' }}</span>
                      <span v-if="folderCollapsed" class="text-xs font-medium tabular-nums">+{{ folderHiddenCount }}</span>
                    </button>
                  </div>
                </div>
                <div v-else class="py-4">
                  <StatusImage name="empty" size="large" :text="$t('tabs.mediaTabListView.emptyFolderTitle')" />
                </div>
              </section>

              <div v-else-if="section.id === 'media'">
                <header class="flex items-center justify-between px-5 pt-3 pb-1">
                  <h3 class="text-sm font-medium text-foreground">{{ $t('views.sidebarModuleList.media') }}</h3>
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{
                      filteredMediaItems.length }}</span>
                    <!-- 素材分组下拉菜单 -->
                    <Dropdown :offset="{ x: 0, y: 4 }" placement="bottom-start">
                      <template #trigger>
                        <button
                          class="flex h-7 w-7 items-center justify-center rounded-lg border border-white/60 bg-white/40 p-0 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-white/60 hover:text-primary dark:border-border dark:bg-muted/60 dark:hover:bg-muted"
                          :title="groupingOptions.find(option => option.value === groupingMode)?.label">
                          <span class="material-icons text-sm">view_agenda</span>
                        </button>
                      </template>
                      <template #content="{ close }">
                        <div class="min-w-[150px] py-1">
                          <button v-for="option in groupingOptions" :key="option.value"
                            :class="['w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 transition-colors', groupingMode === option.value ? 'bg-primary/10 text-primary' : 'text-foreground dark:text-muted-foreground']"
                            @click="handleGroupingChange(option.value); close()">
                            <span>{{ option.label }}</span>
                            <span v-if="groupingMode === option.value"
                              class="material-icons ml-auto text-sm text-primary">check</span>
                          </button>
                        </div>
                      </template>
                    </Dropdown>
                    <ImportDropdown :target="importTarget" @upload="handleListUpload"
                      @import-folder="handleImportFolder" />
                  </div>
                </header>

                <!-- 分组章节导航：滚动时固定在视图右上角 -->
                <div v-if="groupingMode !== 'none' && groupChapters.length > 0"
                  class="sticky top-2 z-20 flex h-0 justify-end px-5 pointer-events-none">
                  <div class="pointer-events-auto px-1 py-2">
                    <ChapterScrubber :chapters="groupChapters" side="left" :row-height="12" :peak-length="42"
                      :label="$t('tabs.mediaTabListView.groupNavigation')" @select="handleGroupChapterSelect" />
                  </div>
                </div>

                <section v-for="(group, groupIndex) in mediaGroups" :key="group.key" class="mb-3"
                  :data-media-group-index="groupIndex">
                  <header v-if="groupingMode !== 'none'"
                    class="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-5 pt-3 pb-1 backdrop-blur-sm">
                    <h4 class="text-sm font-medium text-foreground">{{ group.label }}</h4>
                    <span
                      class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{
                      group.items.length }}</span>
                  </header>

                  <!-- 网格视图 -->
                  <MediaGridComponent v-if="viewMode === 'grid'" :key="`grid-${viewMode}-${group.key}`" class="p-5"
                    :items="group.items" :selected-items="selectedItems" :card-size="cardSize"
                    :columns-per-row="columnsPerRow" :is-trash="viewType === 'trash'" @media-click="handleMediaClick"
                    @media-double-click="handleMediaDoubleClick" @media-select="handleMediaSelect"
                    @media-context-menu="handleMediaContextMenu" @media-info="handleMediaInfo"
                    @media-set-folder="handleMediaSetFolder" @media-set-tags="handleMediaSetTags"
                    @media-delete="handleMediaDelete" @media-restore="handleMediaRestore" />

                  <!-- 列表视图 -->
                  <MediaListComponent v-if="viewMode === 'list'" :key="`list-${viewMode}-${group.key}`" class="p-5"
                    :items="group.items" :selected-items="selectedItems" :is-trash="viewType === 'trash'"
                    @click="handleMediaClick" @dblclick="handleMediaDoubleClick"
                    @media-context-menu="handleMediaContextMenu" @media-info="handleMediaInfo"
                    @media-set-folder="handleMediaSetFolder" @media-set-tags="handleMediaSetTags"
                    @media-select="handleMediaSelect" @media-delete="handleMediaDelete"
                    @media-restore="handleMediaRestore" />

                  <!-- 瀑布流视图 -->
                  <div v-if="viewMode === 'waterfall'" class="w-full">
                    <WaterfallComponent ref="waterfallRef" :key="`waterfall-${viewMode}-${group.key}`" class="p-5"
                      :items="group.items" :selected-items="selectedItems" :is-trash="viewType === 'trash'"
                      :column-width="dynamicColumnWidth" :columns-per-row="columnsPerRow"
                      :gap="compactWaterfall ? 0 : 16" :compact="compactWaterfall"
                      :debug-label="`${groupIndex}:${group.label}`"
                      :lazyload="groupingMode === 'none'"
                      :enter-animation="groupingMode === 'none'" :layout-transition="groupingMode === 'none'"
                      @click="handleMediaClick" @dblclick="handleMediaDoubleClick"
                      @media-context-menu="handleMediaContextMenu" @media-info="handleMediaInfo"
                      @media-set-folder="handleMediaSetFolder" @media-set-tags="handleMediaSetTags"
                      @media-select="handleMediaSelect" @media-delete="handleMediaDelete"
                      @media-restore="handleMediaRestore" />
                  </div>
                </section>

                <!-- 如果没有匹配的视图模式 -->
                <div v-if="!['grid', 'list', 'waterfall'].includes(viewMode)"
                  class="flex items-center justify-center h-40 text-muted-foreground dark:text-muted-foreground">
                  {{ $t('tabs.mediaTabListView.unknownViewMode', { mode: viewMode }) }}
                </div>
              </div>

              <!-- 外部注册的自定义区块 -->
              <MediaTabSectionHost v-else-if="registeredSectionById(section.id)"
                :def="registeredSectionById(section.id)" />
            </template>
          </OrderedSectionList>
        </div>

        <!-- 浮动操作栏 -->
        <div class="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-30">
          <Transition name="toolbar-zoom" appear>
            <div v-if="showFloatingToolbar" ref="toolbarRef"
              class="pointer-events-auto flex items-center space-x-4 bg-white/60 dark:bg-muted/80 backdrop-blur-xl shadow-[0_12px_36px_rgba(99,102,241,0.15)] rounded-full p-1.5 border border-white/60 dark:border-border"
              style="transform-origin: center;">
              <!-- 操作按钮 - 仅在选中文件时显示 -->
              <div v-if="selectedItems.length > 0" class="flex items-center space-x-2">
                <!-- 反选 -->
                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :title="$t('tabs.mediaTabListView.invertSelection')" @click="handleInvertSelection">
                  <span
                    class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">swap_horiz</span>
                </button>
                <!-- 取消选择 -->
                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :title="$t('tabs.mediaTabListView.clearSelection')" @click="handleClearSelection">
                  <span
                    class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">deselect</span>
                </button>
                <div class="h-6 border-l border-border dark:border-border"></div>

                <!-- 回收站：恢复文件 / 彻底删除 -->
                <template v-if="isTrash">
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('tabs.mediaTabListView.restoreFiles', { count: selectedItems.length })"
                    @click="handleToolbarAction('restore')">
                    <span
                      class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">restore</span>
                  </button>
                  <button class="p-2 rounded-full hover:bg-destructive/10 group transition-colors"
                    :title="$t('tabs.mediaTabListView.purgeFiles', { count: selectedItems.length })"
                    @click="handleToolbarAction('purge')">
                    <span
                      class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground group-hover:text-destructive dark:group-hover:text-destructive">delete_forever</span>
                  </button>
                </template>

                <!-- 普通视图：复制 / 打开 / 删除 -->
                <template v-else>
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('common.copy')" @click="handleToolbarAction('copy')">
                    <span class="material-icons text-muted-foreground dark:text-muted-foreground">content_copy</span>
                  </button>
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('tabs.mediaTabListView.open')" @click="handleToolbarAction('open')">
                    <span class="material-icons text-muted-foreground dark:text-muted-foreground">open_in_new</span>
                  </button>
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('tabs.mediaTabListView.deleteFiles', { count: selectedItems.length })"
                    @click="handleToolbarAction('delete')">
                    <span class="material-icons text-muted-foreground dark:text-muted-foreground">delete</span>
                  </button>
                </template>
                <div class="h-6 border-l border-border dark:border-border"></div>
              </div>

              <!-- 分页控件 - 只有多页时显示 -->
              <div v-if="totalPages > 1"
                class="flex items-center space-x-1 text-muted-foreground dark:text-muted-foreground text-xs">
                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :disabled="currentPage === 1" @click="handlePreviousPage">
                  <span class="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                <template v-for="page in paginationPages" :key="page.number">
                  <!-- 省略号 -->
                  <span v-if="page.number === -1" class="px-1">...</span>
                  <!-- 页码按钮 -->
                  <button v-else :class="[
                    'px-2 py-1 rounded-full hover:bg-primary/10 min-w-[28px] transition-colors',
                    page.active ? 'bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary' : ''
                  ]" @click="handlePageChange(page.number)">
                    {{ page.number }}
                  </button>
                </template>

                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :disabled="currentPage === totalPages" @click="handleNextPage">
                  <span class="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <footer
      class="flex items-center justify-between px-2 pt-2 shrink-0 text-xs border-t border-white/60 dark:border-border">
      <div class="flex-1 flex items-center space-x-6 min-w-0">
        <!-- 路由状态 / 面包屑导航 -->
        <Breadcrumb :items="breadcrumbItems" @select="handleBreadcrumbClick" />

        <!-- 当前路径和文件数 -->
        <div v-if="filteredMediaItems.length > 0" class="flex items-center space-x-1 flex-shrink-0 me-2">
          <span class="text-muted-foreground dark:text-muted-foreground">
            {{ $t('tabs.mediaTabListView.fileCount', { count: filteredMediaItems.length }) }}
          </span>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <!-- 已选择素材 - 仅在有选择时显示 -->
        <div v-if="selectedItems.length > 0" class="flex items-center space-x-1">
          <span class="text-primary font-medium">
            {{ $t('tabs.mediaTabListView.selectedCount', { count: selectedItems.length }) }}
          </span>
        </div>

        <!-- 分页信息 - 只有多页时显示 -->
        <div v-if="totalPages > 1" class="flex items-center space-x-1">
          <span class="text-muted-foreground dark:text-muted-foreground">
            {{ $t('tabs.mediaTabListView.pageInfo', { current: currentPage, total: totalPages }) }}
          </span>
        </div>

        <!-- 列数调整滑块 -->
        <div v-if="viewMode === 'grid' || viewMode === 'waterfall'" class="flex items-center space-x-2">
          <input class="w-24 h-1 bg-accent dark:bg-muted rounded-lg appearance-none cursor-pointer" type="range" min="2"
            max="8" :value="columnsPerRow" @input="handleColumnsChange"
            :title="$t('tabs.mediaTabListView.adjustColumns')" />
        </div>

        <!-- 展示字段开关：控制三个视图下媒体项展示哪些信息 -->
        <Dropdown :offset="{ x: 0, y: 8 }" placement="top-end">
          <template #trigger>
            <button
              class="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground dark:text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              :title="$t('tabs.mediaTabListView.fieldSettingsTitle')">
              <span class="material-icons text-sm">visibility</span>
            </button>
          </template>

          <template #content>
            <div class="min-w-[160px] rounded-2xl bg-popover p-2">
              <h3 class="font-medium text-foreground text-sm mb-2 px-1">{{ $t('tabs.mediaTabListView.displayFields') }}
              </h3>
              <!-- 紧密瀑布流开关：仅瀑布流视图显示 -->
              <label v-if="viewMode === 'waterfall'"
                class="flex items-center justify-between space-x-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer">
                <span class="text-sm text-foreground">{{ $t('tabs.mediaTabListView.compactWaterfall') }}</span>
                <Switch :model-value="compactWaterfall"
                  @update:model-value="val => handleCompactWaterfallChange(val === true)" />
              </label>
              <label v-for="col in itemFieldOptions" :key="col.key"
                class="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer">
                <Checkbox :model-value="isItemFieldVisible(col.key)"
                  @update:model-value="val => toggleItemField(col.key, val === true)" />
                <span class="text-sm text-foreground">{{ col.label }}</span>
              </label>
            </div>
          </template>
        </Dropdown>
      </div>
    </footer>

    <!-- 批量删除确认对话框 -->
    <AlertDialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <AlertDialogContent class="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('tabs.mediaTabListView.confirmDeleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('tabs.mediaTabListView.confirmDeleteDesc', { count: selectedItems.length }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label class="flex items-center space-x-2 px-1 pt-1 cursor-pointer select-none">
          <Checkbox :model-value="rememberDeleteChoice"
            @update:model-value="val => rememberDeleteChoice = val === true" />
          <span class="text-sm text-muted-foreground dark:text-muted-foreground">
            {{ $t('tabs.mediaTabListView.rememberDeleteChoice') }}
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="confirmDelete">
            {{ $t('common.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 文件上传对话框 -->
    <FileUploadDialog v-model:visible="showUploadDialog" :initial-files="droppedFiles"
      :initial-folder-id="uploadFolderId" :initial-tag-ids="uploadTagIds" :initial-local-tree="uploadInitialTree" />
    <FolderEditDialog :visible="showFolderDialog" :parent-folder="currentFolder" :available-folders="folderEditAvailableFolders" item-type="folder"
      @close="showFolderDialog = false" @save="handleFolderSave" />

    <!-- 区块排序 / 隐藏设置对话框 -->
    <SortableLayoutDialog v-model="sectionLayoutDialogOpen" :enabled="enabledSections" :disabled="disabledSections"
      :title="$t('tabs.mediaTabListView.sectionLayoutTitle')"
      :description="$t('tabs.mediaTabListView.sectionLayoutDescription')"
      :enabled-title="$t('tabs.mediaTabListView.sectionLayoutEnabled')"
      :disabled-title="$t('tabs.mediaTabListView.sectionLayoutDisabled')"
      :done-label="$t('common.confirm')" :reset-label="$t('common.resetOrder')"
      :empty-disabled-label="$t('tabs.mediaTabListView.sectionLayoutAllEnabled')"
      @update:enabled="updateSectionLayout" @update:disabled="() => {}">
      <template #item="{ item }">
        <span class="material-icons text-base text-muted-foreground">{{ item.icon }}</span>
        <div class="min-w-0 flex-1 truncate text-xs">{{ item.title }}</div>
      </template>
    </SortableLayoutDialog>
  </div>
</template>

<style scoped>
.folder-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, var(--folder-grid-item-size, 128px));
  gap: 1rem;
  align-items: start;
  justify-items: start;
  justify-content: space-around;
  padding: 1.25rem 1.25rem 0;
  box-shadow: none;
}

.folder-card-button {
  display: flex;
  width: auto;
  min-width: 0;
  padding: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.folder-card-button:focus,
.folder-card-button:focus-visible,
.folder-card-button:active {
  outline: none;
  box-shadow: none;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaStore } from '@renderer/stores/media'
import { useTagStore } from '@renderer/stores/tag'
import { useSettingsStore } from '@renderer/stores/settings'
import { useHomeController } from '@renderer/controllers/HomeController'
import { useMediaOperations, useFilters, useViewModeConfig } from '@renderer/composables'
import { useMediaTabData } from '@renderer/composables/useMediaTabData'
import { getLibraryPrefs, getSavedFilters, saveMediaTabLayout } from '@renderer/composables/LibraryPrefs'
import MediaGridComponent from '@renderer/components/business/MediaGridComponent.vue'
import MediaListComponent from '@renderer/components/business/MediaListComponent.vue'
import WaterfallComponent from '@renderer/components/business/WaterfallComponent.vue'
import Folder from '@/components/ui/folder/Folder.vue'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import FolderEditDialog from '@renderer/components/business/FolderEditDialog.vue'
import FolderContextMenu from '@renderer/components/business/FolderContextMenu.vue'
import ImportDropdown from '@renderer/views/HomeView/ImportDropdown.vue'
import FilterBar from '@/renderer/components/business/FilterBar/FilterBar.vue'
import Breadcrumb from '@/renderer/components/common/Breadcrumb.vue'
import StatusImage from '@/renderer/components/common/StatusImage.vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import OrderedSectionList from '@/renderer/components/common/OrderedSectionList.vue'
import SortableLayoutDialog from '@/renderer/components/common/SortableLayoutDialog.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ChapterScrubber } from '@/components/ui/chapter-scrubber'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import type { FileInfo } from '@/shared/types'
import { useMediaTabFetch } from './MediaTabListView/useMediaTabFetch'
import { useMediaTabSelection } from './MediaTabListView/useMediaTabSelection'
import { useMediaTabFilters } from './MediaTabListView/useMediaTabFilters'
import { useMediaTabGrouping } from './MediaTabListView/useMediaTabGrouping'
import { useMediaTabBreadcrumb } from './MediaTabListView/useMediaTabBreadcrumb'
import { useMediaTabFolders } from './MediaTabListView/useMediaTabFolders'
import { useMediaTabUpload } from './MediaTabListView/useMediaTabUpload'
import { useMediaTabBatchOps } from './MediaTabListView/useMediaTabBatchOps'
import { useMediaTabPagination } from './MediaTabListView/useMediaTabPagination'
import { useFloatingToolbar } from './MediaTabListView/useFloatingToolbar'
import { useMediaTabItemFields } from './MediaTabListView/useMediaTabItemFields'
import { getRegisteredTabSections, resolveSectionTitle, MediaTabSectionHost } from './MediaTabListView/tabSections'

// Props
interface Props {
  tabId: string
  libraryId?: string
  label?: string // Tab显示的标签名称
  viewType?: 'files' | 'trash' // 只有 'files' 和 'trash' 两种状态类型
  filters?: Record<string, any> // folder 和 tag 通过这里的 filter 传入
  showFilters?: boolean
  showPagination?: boolean
  pageSize?: number
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  viewType: 'files',
  filters: () => ({}),
  showFilters: true,
  showPagination: true,
  pageSize: 999,
  emptyMessage: ''
})

// Emits
const emit = defineEmits<{
  itemSelect: [item: FileInfo, selected: boolean]
  itemDoubleClick: [item: any]
  selectionChange: [items: any[]]
  filterChange: [filters: Record<string, any>]
  refresh: []
}>()

// 获取共享状态和控制器
const tagStore = useTagStore()
const mediaStore = useMediaStore()
const homeController = useHomeController()

// 使用独立的Tab分页状态管理 (已由MediaTabData替代)
// const tabPagination = useTabPagination(props.tabId)

// 使用专门的MediaTab数据管理
const mediaTabData = useMediaTabData(props.tabId)

// 使用 composables
const mediaOperations = useMediaOperations()
const {
  handleMediaClick,
  handleMediaInfo,
  handleMediaSetFolder,
  handleMediaSetTags,
} = mediaOperations

const filtersComposable = useFilters()
const {
  filterRules,
  handleFilterChange: baseHandleFilterChange,
  handleFilterClear: baseHandleFilterClear
} = filtersComposable

const viewModeConfig = useViewModeConfig()
const {
  viewModes
} = viewModeConfig

// 根元素与瀑布流引用（供分组导航 / 删除键处理 / 视图切换刷新使用）
const mediaTabListViewRef = ref<HTMLElement | null>(null)
const waterfallRef = ref<InstanceType<typeof WaterfallComponent> | InstanceType<typeof WaterfallComponent>[] | null>(null)

// 使用 tab 独立的 viewMode（从 MediaTabData 获取）
const viewMode = computed(() => mediaTabData.viewMode.value)
const isTrash = computed(() => props.viewType === 'trash')
const cardSize = computed(() => homeController.cardSize?.value || 'medium')
const columnsPerRow = computed(() => homeController.columnsPerRow?.value || 6)
const dynamicColumnWidth = computed(() => homeController.dynamicColumnWidth?.value || 200)

// 使用MediaTabData的分页状态
const currentPage = computed(() => mediaTabData.currentPage.value)
const totalPages = computed(() => mediaTabData.totalPages.value)

// 从 MediaTabData 获取数据（优先使用缓存数据）
const paginatedMediaItems = computed(() => {
  const cachedData = mediaTabData.getCachedData()
  if (cachedData.data.length > 0) return cachedData.data
  return homeController.paginatedMediaItems?.value || []
})

// ============================================
// 按功能拆分的组合式函数（实现见 ./MediaTabListView/ 目录）
// ============================================

// 数据加载：分页取数、排序、刷新
const {
  isLoading,
  sortField,
  sortOrder,
  fetchPageData,
  handleRefresh,
  handleManualRefresh,
  handleActiveTabRefresh,
  handleSortChange
} = useMediaTabFetch({ props, mediaTabData, homeController, emit })

// 单页最多展示配置变化时，重新加载第一页使其立即生效
watch(() => mediaTabData.itemsPerPage.value, () => {
  void fetchPageData(1)
})

// 选中逻辑：全选/反选/取消、选中项与详情侧栏同步
const {
  selectedItems,
  isAllSelected,
  handleSelectAll,
  handleMediaSelect,
  handleInvertSelection,
  handleClearSelection
} = useMediaTabSelection({ homeController, paginatedMediaItems, emit })

// 筛选逻辑：合并/清除/应用已保存过滤器
const {
  initializeFilterRules,
  applySnapshotToRule,
  handleFilterChange,
  handleFilterClear,
  handleApplySavedFilter,
  handleClearAllFilters,
  appliedFilterId
} = useMediaTabFilters({
  props,
  mediaTabData,
  homeController,
  filterRules,
  baseHandleFilterChange,
  baseHandleFilterClear,
  fetchPageData
})

// FilterRule 显示状态和查询条件都以当前 tabId 的 MediaTabData 为准。

// 素材分组：按标签/文件夹/文件类型分组 + 章节导航
const {
  groupingMode,
  groupingOptions,
  handleGroupingChange,
  mediaGroups,
  groupChapters,
  handleGroupChapterSelect
} = useMediaTabGrouping({ tabId: props.tabId, paginatedMediaItems, rootEl: () => mediaTabListViewRef.value })

// 面包屑导航
const { breadcrumbItems, handleBreadcrumbClick } = useMediaTabBreadcrumb({ props })

// 子文件夹区：卡片数据、封面加载、新建文件夹对话框
const {
  showFolderDialog,
  availableFolders,
  folderEditAvailableFolders,
  currentFolder,
  handleFolderSave,
  childFolderItems,
  folderCardUiSize,
  folderGridItemSize,
  folderCoverUrls,
  handleChildFolderSelect,
  getFolderColor
} = useMediaTabFolders({ props, homeController, handleRefresh })

// 文件夹区超过两行时折叠：占位卡片占据第二行最后一格，点击切换展开/收起
const folderGridRef = ref<HTMLElement | null>(null)
const folderGridWidth = ref(0)
const FOLDER_GRID_GAP = 16 // 与 .folder-card-grid 的 gap: 1rem 保持一致
const folderColumns = computed(() => {
  const itemSize = folderGridItemSize.value
  if (!folderGridWidth.value || !itemSize) return 0
  return Math.max(1, Math.floor((folderGridWidth.value + FOLDER_GRID_GAP) / (itemSize + FOLDER_GRID_GAP)))
})
const folderGridOverflow = computed(() =>
  folderColumns.value > 0 && childFolderItems.value.length > folderColumns.value * 2
)
const folderCollapsed = ref(true)
const visibleChildFolderItems = computed(() => {
  if (!folderGridOverflow.value || !folderCollapsed.value) return childFolderItems.value
  return childFolderItems.value.slice(0, folderColumns.value * 2 - 1)
})
const folderHiddenCount = computed(() => childFolderItems.value.length - visibleChildFolderItems.value.length)

let folderGridObserver: ResizeObserver | null = null
watch(folderGridRef, el => {
  folderGridObserver?.disconnect()
  if (!el) {
    folderGridWidth.value = 0
    return
  }
  folderGridObserver = new ResizeObserver(entries => {
    folderGridWidth.value = entries[0]?.contentRect.width ?? 0
  })
  folderGridObserver.observe(el)
})

// 拖拽上传 / 导入
const {
  canUpload,
  isDragOver,
  showUploadDialog,
  droppedFiles,
  uploadInitialTree,
  uploadFolderId,
  uploadTagIds,
  importTarget,
  handleListUpload,
  handleImportFolder,
  handleDragOver,
  handleFolderCardDragOver,
  handleFolderCardDragLeave,
  handleDragLeave,
  handleDrop
} = useMediaTabUpload({ props })

// 批量操作：恢复/彻底删除/删除 + 确认弹窗
const {
  handleToolbarAction,
  handleDeleteKeyDown,
  deleteDialogOpen,
  rememberDeleteChoice,
  confirmDelete
} = useMediaTabBatchOps({
  selectedItems,
  mediaTabData,
  homeController,
  handleRefresh,
  rootEl: () => mediaTabListViewRef.value
})

// 分页：页码列表与翻页
const {
  paginationPages,
  handlePreviousPage,
  handleNextPage,
  handlePageChange
} = useMediaTabPagination({ currentPage, totalPages, fetchPageData })

// 浮动操作栏动画
const { toolbarRef, showFloatingToolbar } = useFloatingToolbar({ selectedItems, totalPages })

// 展示字段开关
const { itemFieldOptions, isItemFieldVisible, toggleItemField } = useMediaTabItemFields()

// 紧密瀑布流：取消圆角、间距 0、黑色描边（存于全局设置）
const settingsStore = useSettingsStore()
const compactWaterfall = computed(() => settingsStore.settings.compactWaterfall)
const handleCompactWaterfallChange = async (val: boolean) => {
  await settingsStore.updateSetting('compactWaterfall', val)
}

const filteredMediaItems = computed(() => {
  // 对于MediaTabListView，filteredMediaItems应该等于缓存的总数据
  const cachedData = mediaTabData.getCachedData()
  if (cachedData.total > 0) {
    // 返回一个模拟的数组表示总数量
    return new Array(cachedData.total).fill(null)
  }
  // 回退到homeController的数据
  return homeController.filteredMediaItems?.value || []
})

const folderTreeItems = computed(() => homeController.folderTree.value || [])
const tagTreeItems = computed(() => tagStore.tags || [])

// ============================================
// 区块（内置 folders / media + 外部注册区块）：排序与隐藏
// 布局偏好存全部区块 id，`!` 前缀表示隐藏；未收录的新注册区块默认追加显示
// ============================================
const { t } = useI18n()
interface MediaTabSection { id: string; title: string; icon: string }
// 内置区块：回收站视图没有子文件夹区
const builtinTabSections = computed<MediaTabSection[]>(() => {
  const media = { id: 'media', title: t('views.sidebarModuleList.media'), icon: 'photo_library' }
  return props.viewType === 'trash'
    ? [media]
    : [{ id: 'folders', title: t('views.sidebarModuleList.folders'), icon: 'folder' }, media]
})
// registry 为响应式 Map，运行时注册/注销区块会触发区块列表重算
const registeredTabSections = computed(() => getRegisteredTabSections())
const allTabSections = computed<MediaTabSection[]>(() => [
  ...builtinTabSections.value,
  ...registeredTabSections.value.map(def => ({ id: def.id, title: resolveSectionTitle(def), icon: def.icon || 'extension' })),
])
const registeredSectionById = (id: string) => registeredTabSections.value.find(def => def.id === id)

// 空布局 = 全部按默认顺序显示
const enabledSections = computed<MediaTabSection[]>(() => {
  const order = getLibraryPrefs().mediaTabLayout
  if (!order.length) return allTabSections.value
  const enabledIds = order.filter(id => !id.startsWith('!'))
  const knownIds = new Set(order.map(id => id.replace(/^!/, '')))
  const list = enabledIds
    .map(id => allTabSections.value.find(section => section.id === id))
    .filter(Boolean) as MediaTabSection[]
  allTabSections.value.forEach(section => {
    if (!knownIds.has(section.id)) list.push(section)
  })
  return list
})
const disabledSections = computed(() => {
  const hidden = new Set(
    getLibraryPrefs().mediaTabLayout.filter(id => id.startsWith('!')).map(id => id.slice(1))
  )
  return allTabSections.value.filter(section => hidden.has(section.id))
})

const sectionLayoutDialogOpen = ref(false)
const updateSectionLayout = (items: MediaTabSection[]) => {
  const enabledIds = items.map(item => item.id)
  void saveMediaTabLayout([
    ...enabledIds,
    ...allTabSections.value.filter(section => !enabledIds.includes(section.id)).map(section => `!${section.id}`),
  ])
}

const handleMediaDelete = async (_item: FileInfo) => {
  await handleRefresh()
}

const handleMediaRestore = async (_item: FileInfo) => {
  await handleRefresh()
}

const handleMediaDoubleClick = (item: FileInfo) => {
  mediaStore.setImagePreviewItems(paginatedMediaItems.value)
  homeController.handleMediaDoubleClick(item)
  emit('itemDoubleClick', item)
}

const handleMediaContextMenu = (item: FileInfo, event: MouseEvent) => {
  homeController.handleMediaContextMenu(item, event)
}

const handleColumnsChange = (event: Event) => {
  homeController.handleColumnsChange(event)
}

const handleCtrlWheel = (event: WheelEvent) => {
  if (!event.ctrlKey) return
  if (viewMode.value !== 'grid' && viewMode.value !== 'waterfall') return
  event.preventDefault()
  const delta = event.deltaY > 0 ? 1 : -1
  const next = Math.min(8, Math.max(2, columnsPerRow.value + delta))
  if (next !== columnsPerRow.value) {
    const fake = { target: { value: String(next) } } as unknown as Event
    homeController.handleColumnsChange(fake)
  }
}

// 处理视图模式切换（使用 tab 独立的 viewMode）
const handleViewModeChange = async (mode: 'grid' | 'list' | 'waterfall') => {
  await mediaTabData.setViewMode(mode)
  await nextTick()

  if (mode === 'waterfall') {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    const waterfalls = Array.isArray(waterfallRef.value) ? waterfallRef.value : [waterfallRef.value]
    waterfalls.forEach(instance => instance?.refresh())
  }
}


// 监听Tab ID变化，初始化MediaTabData
watch(() => props.tabId, async (newTabId, _oldTabId) => {
  if (newTabId && props.libraryId) {
    // 初始化 filterRules
    initializeFilterRules()

    // 从 mediaTabData 恢复筛选显示状态（组件随 tab 切换重建时 filterRules 是空实例，
    // 需同步回来，否则筛选徽标 / 清除图标不显示）
    const storedFilters = mediaTabData.filters.value || {}
    filterRules.value.forEach(rule => {
      const stored = storedFilters[rule.id]
      if (stored && typeof stored === 'object' && stored.id) {
        applySnapshotToRule(rule, JSON.parse(JSON.stringify(stored)))
      }
    })

    // 应用素材库默认过滤器（仅当该 tab 尚无用户筛选、且未从持久化恢复过滤器关联时）
    const current = mediaTabData.filters.value || {}
    const hasRuleFilters = Object.values(current).some((v: any) => v && typeof v === 'object' && v.id)
    const hasRestoredApplied = !!appliedFilterId.value
    if (!hasRestoredApplied && !hasRuleFilters) {
      const prefs = getLibraryPrefs()
      const defaultFilter = prefs.defaultFilterId
        ? getSavedFilters().find(f => f.id === prefs.defaultFilterId)
        : null
      if (defaultFilter) {
        await handleApplySavedFilter(defaultFilter.id, defaultFilter.rules)
      }
    }

    // 检查是否有缓存数据
    const cachedData = mediaTabData.getCachedData()
    if (cachedData.total > 0 && cachedData.data.length > 0) {
      mediaTabData.updatePagination({
        totalRecords: cachedData.total,
        isServerPagination: true
      })
    }
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  if (props.libraryId && props.tabId) {
    mediaTabData.getCachedData()
  }

  // 监听 WebSocket 触发的活跃 tab 刷新事件
  window.addEventListener('active-tab-refresh', handleActiveTabRefresh)
})

// 组件卸载时清理
onUnmounted(() => {
  // mediaTabData.cleanup()
  folderGridObserver?.disconnect()
  folderGridObserver = null
  window.removeEventListener('active-tab-refresh', handleActiveTabRefresh)
})

// 监听器
watch(
  () => [props.tabId, props.libraryId, props.filters],
  ([_newTabId, _newLibraryId, newFilters], [_oldTabId, _oldLibraryId, oldFilters]) => {
    // 如果 filters 变化，重新初始化过滤器
    if (JSON.stringify(newFilters) !== JSON.stringify(oldFilters)) {
      // 重新构建初始过滤器
      const initialFilters: Record<string, any> = { ...((newFilters as Record<string, any>) || {}) }
      if (props.viewType === 'trash') {
        initialFilters.recycled = 1
      }
      // 合并现有用户过滤器
      const currentFilters = mediaTabData.filters.value
      const mergedFilters = { ...initialFilters }
      // 保留用户设置的 FilterRule 格式过滤器
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.id) {
          mergedFilters[key] = value
        }
      })
      mediaTabData.setInitialFilters(mergedFilters)
    }
    handleRefresh()
  },
  { deep: true }
)

</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 浮动操作栏：放大/缩小进入退出 */
.toolbar-zoom-enter-active {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease;
}

.toolbar-zoom-leave-active {
  transition: transform 150ms ease-in, opacity 150ms ease;
}

.toolbar-zoom-enter-from,
.toolbar-zoom-leave-to {
  transform: scale(0.6);
  opacity: 0;
}

.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}

.material-symbols-outlined.text-sm {
  font-size: 16px;
}

/* 自定义滚动条 */
:deep(.overflow-y-auto::-webkit-scrollbar) {
  width: 6px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-track) {
  background: var(--scrollbar-track-bg, #f1f1f1);
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb) {
  background: var(--scrollbar-thumb-bg, #c1c1c1);
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
  background: var(--scrollbar-thumb-hover-bg, #a8a8a8);
}

:global(.dark) {
  --scrollbar-track-bg: #374151;
  --scrollbar-thumb-bg: #4b5563;
  --scrollbar-thumb-hover-bg: #6b7280;
}

/* 悬停效果 */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

.group:hover .group-hover\:bg-black\/20 {
  background-color: rgba(0, 0, 0, 0.2);
}

/* 过渡动画 */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
