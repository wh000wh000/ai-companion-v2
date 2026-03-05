import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/trust/calculator.ts',
    'src/economy/engine.ts',
    'src/surprise/engine.ts',
    'src/demo/manager.ts',
    'src/appearance/index.ts',
    'src/emotion/mapping.ts',
    'src/types/index.ts',
  ],
  dts: true,
})
