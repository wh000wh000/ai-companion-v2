import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useOnboardingStore } from '@proj-airi/stage-ui/stores/onboarding'
import { useProvidersStore } from '@proj-airi/stage-ui/stores/providers'

/**
 * Auto-configures OpenRouter provider when VITE_OPENROUTER_API_KEY is set.
 * This allows the app to have a working chat provider out of the box
 * without requiring manual configuration through the settings UI.
 *
 * Also marks onboarding as completed so users can start chatting immediately.
 */
export function useAutoProviderSetup() {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined
  const defaultModel = (import.meta.env.VITE_OPENROUTER_MODEL as string | undefined) || 'anthropic/claude-sonnet-4'

  if (!apiKey) {
    return { configured: false }
  }

  const providersStore = useProvidersStore()
  const consciousnessStore = useConsciousnessStore()
  const onboardingStore = useOnboardingStore()

  const providerId = 'openrouter-ai'

  // Only auto-configure if provider is not already configured by user
  const existingConfig = providersStore.getProviderConfig(providerId)
  if (existingConfig?.apiKey) {
    // Provider already configured — still suppress onboarding
    onboardingStore.markSetupCompleted()
    return { configured: true, skipped: true }
  }

  // Set provider credentials
  providersStore.providers[providerId] = {
    apiKey,
    baseUrl: 'https://openrouter.ai/api/v1/',
  }

  // Mark provider as added and force configured (skip validation to avoid network call on startup)
  providersStore.markProviderAdded(providerId)
  providersStore.forceProviderConfigured(providerId)

  // Set as active provider and model if not already configured
  if (!consciousnessStore.activeProvider) {
    consciousnessStore.activeProvider = providerId
  }

  if (!consciousnessStore.activeModel) {
    consciousnessStore.activeModel = defaultModel
  }

  // Mark onboarding as completed — provider is ready, no need for setup wizard
  onboardingStore.markSetupCompleted()

  return { configured: true, skipped: false }
}
