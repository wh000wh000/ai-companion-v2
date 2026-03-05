<script setup lang="ts">
import { Callout } from '@proj-airi/ui'
</script>

<template>
  <Story
    title="Callout"
    group="common"
    :layout="{ type: 'grid', width: '100%' }"
  >
    <template #controls>
      <ThemeColorsHueControl />
    </template>

    <Variant
      id="default"
      title="Default"
    >
      <Callout>
        <div>
          <div>
            Primary theme.
          </div>
          <div>
            伪春菜主题，基于 <a decoration-underline decoration-dashed href="https://github.com/proj-airi/chromatic">Chromatic</a> 设计系统。
          </div>
        </div>
      </Callout>
    </Variant>

    <Variant
      id="theme"
      title="Theme Variants"
    >
      <Callout theme="violet">
        <div>
          <div>
            伪春菜完全在你的浏览器本地运行，我们不会窃取你的 AI / LLM 提供商凭据。但请注意，你的 API 密钥是敏感信息，请妥善保管，不要与他人分享。
          </div>
          <div>
            伪春菜已在以下位置开源 <div inline-flex translate-y-1 items-center gap-1>
              <div i-simple-icons:github inline-block /><a decoration-underline decoration-dashed href="https://github.com/moeru-ai/airi" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>, if you want to check how we handle your credentials, feel free to inspect our code.
          </div>
        </div>
      </Callout>
    </Variant>

    <Variant
      id="label-props"
      title="With Label"
    >
      <Callout theme="lime" label="Tips!">
        <div>
          Do you know that you can use the <code>label</code> prop to add a label to the callout? This is useful for highlighting important information or tips.
        </div>
      </Callout>
    </Variant>

    <Variant
      id="label-slot"
      title="With Label Slot"
    >
      <Callout theme="orange">
        <template #label>
          <div flex items-center gap-1 font-normal>
            <div i-solar:danger-circle-bold-duotone text-lg />
            <div text-base>
              Before deleting data...
            </div>
          </div>
        </template>
        <div text-base>
          <div>
            This action cannot be undone. Make sure you have a backup of your data before proceeding.
          </div>
        </div>
      </Callout>
    </Variant>
  </Story>
</template>
