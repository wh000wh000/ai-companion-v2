import { useLogger } from '@guiiai/logg'

// ─── 类型定义 ──────────────────────────────────────

/** 商品推荐结果 */
export interface ProductRecommendation {
  /** 商品名称 */
  name: string
  /** 价格（分） */
  price: number
  /** 分类 */
  category: string
  /** 推荐理由（自然语言） */
  reason: string
  /** 外卖平台搜索链接 */
  searchUrl: string
  /** 商品图片（v1 暂无） */
  imageUrl: string | null
}

// ─── 默认商品库 ────────────────────────────────────
// 美团 API 未接入前，使用静态商品库做选品推荐

const DEFAULT_PRODUCTS: Array<Omit<ProductRecommendation, 'reason' | 'searchUrl'>> = [
  { name: '草莓大福', price: 800, category: '零食', imageUrl: null },
  { name: '珍珠奶茶', price: 1200, category: '饮品', imageUrl: null },
  { name: '马卡龙', price: 1500, category: '零食', imageUrl: null },
  { name: '鲜花一束', price: 2000, category: '小物件', imageUrl: null },
  { name: '手工巧克力', price: 2500, category: '零食', imageUrl: null },
  { name: '抹茶蛋糕', price: 1800, category: '零食', imageUrl: null },
  { name: '水果茶', price: 1000, category: '饮品', imageUrl: null },
  { name: '可爱钥匙扣', price: 500, category: '小物件', imageUrl: null },
]

// ─── 服务工厂 ──────────────────────────────────────

export function createO2OService() {
  const logger = useLogger('o2o-service').useGlobalConfig()

  return {
    /**
     * 根据预算和偏好推荐商品
     * 筛选逻辑：预算内 → 偏好匹配 → 品类权重 → 取 top 3
     */
    recommend(params: {
      budget: number
      preferences: string[]
      location?: string
    }): ProductRecommendation[] {
      const { budget, preferences, location } = params

      // 筛选预算内商品（不超过可用零花钱的 80%）
      const affordable = DEFAULT_PRODUCTS.filter(p => p.price <= budget * 0.8)

      if (affordable.length === 0) {
        logger.log(`No affordable products for budget=${budget}`)
        return []
      }

      // 按偏好和品类权重打分
      const scored = affordable.map((product) => {
        let score = 0
        // 偏好关键词匹配
        for (const pref of preferences) {
          if (product.name.includes(pref) || product.category.includes(pref)) {
            score += 10
          }
        }
        // 品类默认权重：零食 > 饮品 > 小物件
        if (product.category === '零食')
          score += 3
        if (product.category === '饮品')
          score += 2
        if (product.category === '小物件')
          score += 1

        return { ...product, score }
      })

      // 降序排序取前 3
      scored.sort((a, b) => b.score - a.score)

      return scored.slice(0, 3).map(p => ({
        name: p.name,
        price: p.price,
        category: p.category,
        reason: p.score >= 10 ? `你之前说过喜欢${preferences[0]}～` : '觉得你可能会喜欢',
        searchUrl: this.generateSearchUrl(p.name, 'meituan', location),
        imageUrl: p.imageUrl,
      }))
    },

    /**
     * 生成外卖平台搜索链接
     * 支持美团外卖 / 饿了么
     */
    generateSearchUrl(productName: string, platform: string, location?: string): string {
      const encoded = encodeURIComponent(productName)

      if (platform === 'eleme') {
        return `https://h5.ele.me/search/?q=${encoded}`
      }

      // 默认美团外卖
      const locationParam = location ? `&city=${encodeURIComponent(location)}` : ''
      return `https://waimai.meituan.com/search?q=${encoded}${locationParam}`
    },
  }
}

export type O2OService = ReturnType<typeof createO2OService>
