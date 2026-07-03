import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_OBJECTIVE = {
  objective:      'Lead Generation + Sales',
  campaignGoal:   'Generate qualified leads for DTF printing service',
  targetAudience: 'Print Shop Owners, Small Business Owners',
  geography:      'United States',
  product:        'DTF Heat Transfer Printing',
  keyBenefit:     'Fast turnaround, vibrant colors, wash-durable prints',
  offer:          'Free Shipping on Orders $49+',
  kpiFocus:       ['Leads', 'CPA', 'ROAS'],
}

const useBriefStore = create(
  persist(
    (set) => ({
      currentStep: 3,
      objective:   DEFAULT_OBJECTIVE,
      generatedAt: null,

      setStep:      (step)      => set({ currentStep: step }),
      setObjective: (objective) => set({ objective }),
      markGenerated: ()         => set({ generatedAt: new Date().toISOString() }),
      reset: ()                 => set({ currentStep: 1, objective: DEFAULT_OBJECTIVE, generatedAt: null }),
    }),
    {
      name: 'brief-wizard',
      partialize: (s) => ({
        currentStep: s.currentStep,
        objective:   s.objective,
        generatedAt: s.generatedAt,
      }),
    }
  )
)

export default useBriefStore
