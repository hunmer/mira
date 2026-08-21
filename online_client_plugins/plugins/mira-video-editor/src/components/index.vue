<template>
  <div
    class="video-editor"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 拖放遮罩层 -->
    <Transition name="fade">
      <div v-if="isDragging" class="drop-overlay">
        <div class="drop-content">
          <div class="drop-icon"><VideoIcon style="width: 64px; height: 64px" /></div>
          <div class="drop-text">释放鼠标添加视频</div>
          <div class="drop-hint">支持 MP4, AVI, MOV, MKV 等格式</div>
        </div>
      </div>
    </Transition>

    <!-- 场景右键菜单 -->
    <SceneContextMenu
      :context-menu="sceneState.contextMenu.value"
      :show-merge-sub-menu="sceneState.showMergeSubMenu.value"
      :handle-menu-wrapper-leave="sceneState.handleMenuWrapperLeave"
      :handle-merge-scenes="sceneState.handleMergeScenes"
      :handle-unmerge-scene="sceneState.handleUnmergeScene"
      :handle-export-merged-scene="sceneState.handleExportMergedScene"
      :handle-export-single-scene="sceneState.handleExportSingleScene"
    />

    <!-- 导出片段对话框 -->
    <ExportClipsDialog
      ref="exportClipsDialogRef"
      :video="selectedVideo"
      :clip-count="selectedVideo ? Object.keys(selectedVideo.clips).length : 0"
    />

    <!-- 中间内容区 -->
    <div class="main-content">
      <ResizablePanelGroup direction="horizontal" auto-save-id="video-editor-layout">
        <!-- 视频播放器 -->
        <ResizablePanel :min-size="30" :default-size="55">
          <VideoPlayer
            ref="videoPlayerRef"
            :key="selectedVideo?.path || 'no-video'"
            :video="selectedVideo"
            v-model:clip-start-time="clipStartTime"
            v-model:clip-end-time="clipEndTime"
            @create-clip="handleCreateClip"
            @duration-loaded="handleDurationLoaded"
            @time-update="handleTimeUpdate"
            @focus-description="focusDescriptionInput"
            @trigger-create-clip="triggerAddClip"
            @metadata-loaded="handleMetadataLoaded"
          />
        </ResizablePanel>

        <ResizableHandle with-handle />

        <!-- 右侧面板 -->
        <ResizablePanel :min-size="25" :default-size="45" class="right-panel">
        <Tabs v-model="activeToolTab" class="right-tabs">
          <TabsList class="right-tabs-list w-full">
            <TabsTrigger value="files" class="right-tab-trigger" title="文件列表">
              <span class="tab-icon"><FileIcon style="width: 18px; height: 18px" /></span>
            </TabsTrigger>
            <TabsTrigger value="clip" class="right-tab-trigger" title="剪辑工具">
              <span class="tab-icon"><ScissorsIcon style="width: 18px; height: 18px" /></span>
            </TabsTrigger>
            <TabsTrigger value="clips" class="right-tab-trigger" title="片段列表">
              <span class="tab-icon"><ClipboardIcon style="width: 18px; height: 18px" /></span>
            </TabsTrigger>
            <TabsTrigger value="split" class="right-tab-trigger" title="智能分割">
              <span class="tab-icon"><VideoIcon style="width: 18px; height: 18px" /></span>
            </TabsTrigger>
            <TabsTrigger value="watermark" class="right-tab-trigger" title="水印">
              <span class="tab-icon"><TransparencyGridIcon style="width: 18px; height: 18px" /></span>
            </TabsTrigger>
            <TabsTrigger value="thumbnails" class="right-tab-trigger" title="缩略图预览">
              <span class="tab-icon"><ImageIcon style="width: 18px; height: 18px" /></span>
            </TabsTrigger>
          </TabsList>

          <!-- 文件列表 Tab -->
          <TabsContent value="files" class="right-tab-content">
            <VideoListSidebar
              ref="videoListSidebarRef"
              @video-selected="handleVideoSelected"
            />
          </TabsContent>

          <!-- 剪辑工具 Tab -->
          <TabsContent value="clip" class="right-tab-content">
            <ClipToolTab
              :selected-video="selectedVideo"
              :clip-start-time="clipStartTime"
              :clip-end-time="clipEndTime"
              :clip-description="clipDescription"
              :clip-tags="clipTags"
              :current-play-time="currentPlayTime"
              :is-valid-clip-time="clipState.isValidClipTime.value"
              @update:clip-start-time="clipStartTime = $event"
              @update:clip-end-time="clipEndTime = $event"
              @update:clip-description="clipDescription = $event"
              @update:clip-tags="clipTags = $event"
              @create-clip="clipState.createClip()"
              @set-clip-start-to-zero="setClipStartToZero()"
              @set-clip-start-to-current="setClipStartToCurrent()"
              @set-clip-end-to-max="setClipEndToMax()"
              @set-clip-end-to-current="setClipEndToCurrent()"
              @validate-clip-time="validateClipTime()"
            />
          </TabsContent>

          <!-- 视频片段 Tab -->
          <TabsContent value="clips" class="right-tab-content">
            <ClipsListTab
              :selected-video="selectedVideo"
              :clip-thumbnails="clipState.clipThumbnails.value"
              :thumbnail-loading="clipState.thumbnailLoading.value"
              :is-exporting="clipState.isExporting.value"
              :export-progress="clipState.exportProgress.value"
              :generate-clip-thumbnail="clipState.generateClipThumbnail"
              :handle-clip-thumbnail-error="clipState.handleClipThumbnailError"
              @preview-clip="previewClip"
              @edit-clip="(clip) => clipState.editClip(clip, (tab) => { activeToolTab = tab })"
              @export-clip="clipState.exportClip"
              @delete-clip="clipState.deleteClip"
              @export-all-clips="exportAllClips"
            />
          </TabsContent>

          <!-- 智能分割 Tab -->
          <TabsContent value="split" class="right-tab-content">
            <SplitTab
              :selected-video="selectedVideo"
              :clip-start-time="clipStartTime"
              :clip-end-time="clipEndTime"
              :is-valid-clip-time="clipState.isValidClipTime.value"
              :show-split-settings-dialog="sceneState.showSplitSettingsDialog.value"
              :use-selected-range="sceneState.useSelectedRange.value"
              :min-scene-duration="sceneState.minSceneDuration.value"
              :is-splitting="sceneState.isSplitting.value"
              :split-progress="sceneState.splitProgress.value"
              :scene-segments="sceneState.sceneSegments.value"
              :selected-scenes="sceneState.selectedScenes.value"
              @update:show-split-settings-dialog="sceneState.showSplitSettingsDialog.value = $event"
              @update:use-selected-range="sceneState.useSelectedRange.value = $event"
              @update:min-scene-duration="sceneState.minSceneDuration.value = $event"
              @open-split-settings="sceneState.showSplitSettingsDialog.value = true"
              @close-split-settings="sceneState.showSplitSettingsDialog.value = false; sceneState.startSceneDetection()"
              @start-scene-detection="sceneState.showSplitSettingsDialog.value = false; sceneState.startSceneDetection()"
              @cancel-scene-detection="sceneState.cancelSceneDetection()"
              @select-all-scenes="sceneState.selectAllScenes()"
              @clear-all-scenes="sceneState.clearSceneCacheAndReset()"
              @clear-scene-selection="sceneState.clearSceneSelection()"
              @toggle-scene-selection="sceneState.toggleSceneSelection"
              @shift-click-scene="sceneState.handleShiftClickScene"
              @add-selected-scenes-to-clips="sceneState.addSelectedScenesToClips()"
              @handle-scene-context-menu="sceneState.handleSceneContextMenu"
              @handle-thumbnail-error="sceneState.handleThumbnailError"
              @preview-scene="previewScene"
            />
          </TabsContent>

          <!-- 水印 Tab -->
          <TabsContent value="watermark" class="right-tab-content">
            <WatermarkTab
              v-if="selectedVideo"
              ref="watermarkTabRef"
              :video="selectedVideo"
              :list-id="currentListId"
              :current-time="currentPlayTime"
            />
            <div v-else class="empty-state">
              请先选择一个视频
            </div>
          </TabsContent>

          <!-- 缩略图预览 Tab -->
          <TabsContent value="thumbnails" class="right-tab-content">
            <ThumbnailsTab
              :selected-video="selectedVideo"
              :thumbnails="thumbnailState.thumbnails.value"
              :is-loading-thumbnails="thumbnailState.isLoadingThumbnails.value"
              :thumbnail-progress="thumbnailState.thumbnailProgress.value"
              :thumbnail-progress-message="thumbnailState.thumbnailProgressMessage.value"
              :clip-start-time="clipStartTime"
              :clip-end-time="clipEndTime"
              :current-play-time="currentPlayTime"
              :is-in-existing-clip="thumbnailState.isInExistingClip"
              :find-clip-at-time="thumbnailState.findClipAtTime"
              @load-thumbnails="thumbnailState.loadThumbnails()"
              @handle-thumbnail-click="thumbnailState.handleThumbnailClick"
              @delete-clip="clipState.deleteClip"
            />
          </TabsContent>
        </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'mira-plugin-ui/src/components/ui/tabs'
import { VideoIcon, FileIcon, ScissorsIcon, ClipboardIcon, TransparencyGridIcon, ImageIcon } from '@radix-icons/vue'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from 'mira-plugin-ui/src/components/ui/resizable'
import VideoListSidebar from './VideoListSidebar.vue'
import VideoPlayer from './VideoPlayer.vue'
import ExportClipsDialog from './ExportClipsDialog.vue'
import WatermarkTab from './WatermarkTab.vue'
import SceneContextMenu from './SceneContextMenu.vue'
import ClipToolTab from './ClipToolTab.vue'
import ClipsListTab from './ClipsListTab.vue'
import SplitTab from './SplitTab.vue'
import ThumbnailsTab from './ThumbnailsTab.vue'
import { useVideoEditorState } from '../composables/useVideoEditorState'

const {
  isDragging,
  selectedVideo,
  currentListId,
  activeToolTab,
  currentPlayTime,
  videoPlayerRef,
  videoListSidebarRef,
  watermarkTabRef,
  descriptionInputRef,
  exportClipsDialogRef,
  clipStartTime,
  clipEndTime,
  clipDescription,
  clipTags,
  clipState,
  sceneState,
  thumbnailState,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleVideoSelected,
  handleCreateClip,
  handleTimeUpdate,
  setClipStartToCurrent,
  setClipEndToCurrent,
  setClipStartToZero,
  setClipEndToMax,
  validateClipTime,
  previewClip,
  previewScene,
  handleDurationLoaded,
  handleMetadataLoaded,
  focusDescriptionInput,
  triggerAddClip,
  exportAllClips,
} = useVideoEditorState()
</script>

<style scoped src="./VideoEditor.css"></style>
