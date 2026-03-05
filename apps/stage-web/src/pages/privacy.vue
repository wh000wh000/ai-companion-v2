<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div flex="~ col gap-6" p-4 max-w-2xl mx-auto>
    <!-- Header -->
    <div flex="~ items-center gap-2">
      <button
        p-2.5 rounded-lg min-w-11 min-h-11
        class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <span text="xl neutral-800 dark:neutral-100" font-bold>隐私政策</span>
    </div>

    <div text="sm neutral-600 dark:neutral-300" leading-relaxed flex="~ col gap-4">
      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>1. 信息收集</h2>
        <p>我们收集您在使用伪春菜时提供的以下信息：</p>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>注册信息（邮箱地址、用户名）</li>
          <li>聊天记录（用于提供个性化服务）</li>
          <li>充值和消费记录</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>2. 信息使用</h2>
        <p>我们使用收集的信息用于：</p>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>提供和改善 AI 伴侣服务</li>
          <li>处理支付和交易</li>
          <li>发送服务通知</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>3. 信息保护</h2>
        <p>我们采取行业标准的安全措施保护您的个人信息，包括数据加密、访问控制等。</p>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>4. 信息共享</h2>
        <p>我们不会将您的个人信息出售给第三方。仅在以下情况下可能共享信息：</p>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>经您明确同意</li>
          <li>法律法规要求</li>
          <li>为完成支付交易所必需（如支付服务提供商）</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>5. 数据存储与安全</h2>
        <p>您的数据存储在受保护的服务器上，我们采用加密传输（TLS/SSL）和加密存储来保障数据安全。我们仅在实现服务目的所必需的期限内保留您的个人信息。</p>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>6. 未成年人保护</h2>
        <p>我们重视未成年人保护。未满 18 周岁的用户每月消费将受到限额约束，具体限额根据年龄段设定。我们建议未成年用户在监护人指导下使用本服务。</p>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>7. 您的权利</h2>
        <p>您有权：</p>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>查看和更正您的个人信息</li>
          <li>请求删除您的账号及相关数据</li>
          <li>撤回授权同意</li>
          <li>获取您的个人信息副本</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>8. 联系我们</h2>
        <p>如有隐私相关问题，请通过应用内反馈功能联系我们。</p>
      </section>

      <p text="xs neutral-400 dark:neutral-500" mt-4>
        最后更新：2026年3月
      </p>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
