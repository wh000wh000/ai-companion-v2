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
        bg="transparent hover:neutral-100/50 dark:hover:neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <span text="xl neutral-800 dark:neutral-100" font-bold>用户协议</span>
    </div>

    <div text="sm neutral-600 dark:neutral-300" leading-relaxed flex="~ col gap-4">
      <p>欢迎使用伪春菜服务。请在使用本服务前仔细阅读以下协议条款。使用本服务即表示您同意接受以下条款的约束。</p>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>1. 服务说明</h2>
        <p>伪春菜是一款 AI 伴侣应用，为用户提供个性化的虚拟角色互动体验。服务内容包括但不限于：</p>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>AI 角色对话与互动</li>
          <li>角色成长与关系发展</li>
          <li>虚拟礼物赠送与惊喜系统</li>
          <li>角色外观与个性化定制</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>2. 用户行为规范</h2>
        <p>使用本服务时，您同意：</p>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>不发布违法、有害、威胁、辱骂、骚扰性的内容</li>
          <li>不以任何方式干扰或破坏服务的正常运行</li>
          <li>不使用自动化工具或脚本滥用服务</li>
          <li>不尝试反编译、反向工程或破解服务</li>
          <li>遵守中华人民共和国相关法律法规</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>3. 虚拟货币说明</h2>
        <p>本服务使用「爱心币」作为应用内虚拟货币：</p>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>爱心币为虚拟货币，仅限在本应用内使用</li>
          <li>爱心币不可兑换为人民币或其他法定货币，不可提现</li>
          <li>爱心币不可在用户之间转让或交易</li>
          <li>零花钱收益由系统按照订阅等级自动分成，仅作为应用内激励</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>4. 充值与退款政策</h2>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>充值金额以页面显示为准，支持多档位选择</li>
          <li>首充翻倍奖励每个账号仅限一次</li>
          <li>充值成功后，因虚拟商品的特殊性质，原则上不支持退款</li>
          <li>如因系统故障导致充值异常，请联系客服处理</li>
          <li>未成年用户充值需遵守相关消费限额规定</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>5. 知识产权声明</h2>
        <p>本服务中的所有内容，包括但不限于文本、图像、音频、视频、软件、代码、界面设计和角色形象等，其知识产权均归服务提供方所有。未经书面许可，不得复制、修改、分发或以其他方式使用上述内容。</p>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>6. 免责声明</h2>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>AI 生成的内容仅供娱乐，不构成专业建议</li>
          <li>我们不对因网络中断、系统故障等不可抗力导致的服务中断承担责任</li>
          <li>对于用户因违反本协议导致的任何损失，我们不承担责任</li>
          <li>服务可能因维护升级而暂时中断，我们将尽量提前通知</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>7. 账号管理</h2>
        <ul list-disc pl-5 mt-2 flex="~ col gap-1">
          <li>您有义务妥善保管账号信息，因账号泄露导致的损失由用户自行承担</li>
          <li>长期未登录的账号可能会被系统回收</li>
          <li>违反本协议的账号可能被限制功能或永久封禁</li>
        </ul>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>8. 协议变更</h2>
        <p>我们保留随时修改本协议的权利。协议变更后，我们将通过应用内通知等方式告知用户。继续使用本服务即视为您同意修改后的协议。如您不同意变更内容，应停止使用本服务。</p>
      </section>

      <section>
        <h2 text="lg neutral-800 dark:neutral-100" font-semibold mb-2>9. 适用法律与争议解决</h2>
        <p>本协议适用中华人民共和国法律。因本协议引起的或与本协议有关的争议，双方应友好协商解决；协商不成的，任何一方可向服务提供方所在地有管辖权的人民法院提起诉讼。</p>
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
