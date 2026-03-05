<script setup lang="ts">
import type { Character } from '@proj-airi/stage-ui/types/character'

import { useCharacterStore } from '@proj-airi/stage-ui/stores/characters'
import { Button, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

import CharacterDialog from './components/CharacterDialog.vue'
import CharacterItem from './components/CharacterItem.vue'
import { useCharacterLoader } from '../../../composables/useCharacterLoader'

const characterStore = useCharacterStore()
const { characters } = storeToRefs(characterStore)

const {
  presets,
  selectedCharacterId,
  loading: presetsLoading,
  selectCharacter,
  fetchPresets,
} = useCharacterLoader()

// Fetch on mount
onMounted(() => {
  characterStore.fetchList().catch(console.error)
  fetchPresets().catch(console.error)
})

// Search
const searchQuery = ref('')
const filteredCharacters = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return Array.from(characters.value.values()).filter((char) => {
    const i18n = char.i18n?.find(i => i.language === 'en') || char.i18n?.[0]
    return i18n?.name.toLowerCase().includes(query) || i18n?.description.toLowerCase().includes(query)
  })
})

const filteredPresets = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query)
    return presets.value
  return presets.value.filter((preset) => {
    const i18n = preset.i18n?.find(i => i.language === 'zh-CN') ?? preset.i18n?.[0]
    return i18n?.name.toLowerCase().includes(query) || i18n?.description.toLowerCase().includes(query)
  })
})

// Selection / Dialog
const isDialogOpen = ref(false)
const selectedCharacter = ref<Character | undefined>(undefined)

function handleCreate() {
  selectedCharacter.value = undefined
  isDialogOpen.value = true
}

function handleEdit(char: Character) {
  selectedCharacter.value = char
  isDialogOpen.value = true
}

function handleDelete(id: string) {
  // TODO: Remove this
  // eslint-disable-next-line no-alert
  if (confirm('Are you sure you want to delete this character?')) {
    characterStore.remove(id).catch(console.error)
  }
}

function handleActivate(char: Character) {
  // TODO: Implement activation logic (global store for active character)
  // eslint-disable-next-line no-console
  console.log('Activate', char.id)
}

function getPresetI18n(preset: { i18n?: Array<{ language: string, name: string, description: string, tags: string[] }> }) {
  return preset.i18n?.find(i => i.language === 'zh-CN') ?? preset.i18n?.[0]
}
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-4 md:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl text-neutral-900 font-bold dark:text-neutral-100">
          Characters
        </h1>
        <p class="mt-1 text-neutral-500 dark:text-neutral-400">
          Manage your AI characters and their capabilities.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <FieldInput
          v-model="searchQuery"
          placeholder="Search..."
          class="w-64"
        />
        <Button @click="handleCreate">
          <div class="i-solar:add-circle-bold mr-2" />
          Create New
        </Button>
      </div>
    </div>

    <!-- Preset Characters Section -->
    <div v-if="filteredPresets.length > 0" class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <div class="i-solar:star-bold-duotone text-lg text-amber-500" />
        <h2 class="text-lg text-neutral-800 font-semibold dark:text-neutral-200">
          Preset Characters
        </h2>
        <span class="text-sm text-neutral-400">({{ filteredPresets.length }})</span>
      </div>

      <div
        class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-5"
      >
        <button
          v-for="preset in filteredPresets"
          :key="preset.id"
          class="group relative min-h-120px flex flex-col cursor-pointer overflow-hidden border-2 rounded-xl p-0 transition-all duration-300"
          :class="[
            selectedCharacterId === preset.id
              ? 'border-primary-400 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/20'
              : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 hover:border-primary-300 dark:hover:border-primary-700',
          ]"
          @click="selectCharacter(preset.id)"
        >
          <!-- Card content -->
          <div class="flex flex-1 flex-col gap-2 p-5">
            <div class="flex items-start justify-between gap-2">
              <h3 class="flex-1 truncate text-lg font-medium">
                {{ getPresetI18n(preset)?.name ?? preset.characterId }}
              </h3>
              <div
                v-if="selectedCharacterId === preset.id"
                class="shrink-0 rounded-md bg-primary-100 p-1 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400"
              >
                <div class="i-solar:check-circle-bold-duotone text-sm" />
              </div>
            </div>

            <p class="line-clamp-3 min-h-40px flex-1 text-sm text-neutral-500 dark:text-neutral-400">
              {{ getPresetI18n(preset)?.description ?? '' }}
            </p>

            <!-- Tags -->
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in (getPresetI18n(preset)?.tags ?? []).slice(0, 4)"
                :key="tag"
                class="rounded-md bg-neutral-200/60 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- Active indicator bar -->
          <div
            v-if="selectedCharacterId === preset.id"
            class="h-1 w-full bg-primary-400 dark:bg-primary-500"
          />
        </button>
      </div>
    </div>

    <!-- Loading state for presets -->
    <div v-else-if="presetsLoading" class="flex items-center justify-center py-8">
      <div class="i-svg-spinners:90-ring-with-bg text-3xl text-primary-500" />
    </div>

    <!-- Divider -->
    <div v-if="filteredPresets.length > 0" class="border-b border-neutral-200 dark:border-neutral-800" />

    <!-- Custom Characters Section -->
    <div class="flex flex-col gap-3">
      <h2 class="text-lg text-neutral-800 font-semibold dark:text-neutral-200">
        Custom Characters
      </h2>

      <div v-if="characters.size === 0 && !presetsLoading" class="flex flex-1 items-center justify-center py-8">
        <p class="text-neutral-400 dark:text-neutral-500">
          No custom characters yet. Click "Create New" to get started.
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 pb-20 lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-5"
      >
        <!-- Create Card (Visual) -->
        <button
          class="group relative min-h-120px flex flex-col cursor-pointer items-center justify-center gap-3 overflow-hidden border-2 border-neutral-200 rounded-xl border-dashed bg-neutral-50/50 p-6 transition-all duration-300 dark:border-neutral-800 hover:border-primary-400 dark:bg-neutral-900/20 hover:bg-primary-50/30 dark:hover:border-primary-600 dark:hover:bg-primary-900/10"
          @click="handleCreate"
        >
          <div class="i-solar:add-circle-linear text-5xl text-neutral-300 transition-colors dark:text-neutral-700 group-hover:text-primary-400 dark:group-hover:text-primary-500" />
          <span class="text-neutral-500 font-medium transition-colors dark:text-neutral-500 group-hover:text-primary-600 dark:group-hover:text-primary-400">
            Create Character
          </span>
        </button>

        <!-- Items -->
        <CharacterItem
          v-for="char in filteredCharacters"
          :key="char.id"
          :character="char"
          :is-active="false"
          :is-selected="selectedCharacter?.id === char.id"
          @select="handleEdit(char)"
          @activate="handleActivate(char)"
          @delete="handleDelete(char.id)"
        />
      </div>
    </div>

    <CharacterDialog
      v-model="isDialogOpen"
      :character="selectedCharacter"
      @submit="characterStore.fetchList()"
    />
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  title: Characters
  subtitleKey: settings.title
</route>
