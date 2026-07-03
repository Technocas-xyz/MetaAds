import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_FORM = {
  objective:     'conversions',
  name:          'DTF Transfers - Conversions - May 2026',
  buyingType:    'auction',
  cboEnabled:    true,
  budgetType:    'daily',
  budgetAmount:  '50.00',
  currency:      'USD',
  schedule:      'continuous',
  startDate:     '',
  endDate:       '',
}

const useCampaignStore = create(
  persist(
    (set) => ({
      currentStep: 2,
      formData:    DEFAULT_FORM,

      setStep:     (step)      => set({ currentStep: step }),
      setFormData: (patch)     => set((s) => ({ formData: { ...s.formData, ...patch } })),
      reset:       ()          => set({ currentStep: 1, formData: DEFAULT_FORM }),
    }),
    {
      name: 'campaign-wizard',
      partialize: (s) => ({ currentStep: s.currentStep, formData: s.formData }),
    }
  )
)

export default useCampaignStore
