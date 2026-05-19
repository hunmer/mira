import { reactive, computed } from 'vue'

export interface InitializationStep {
  id: string
  label: string
  completed: boolean
  active: boolean
  error?: string
}

export interface InitializationState {
  isInitializing: boolean
  currentStep: string
  progress: number
  steps: InitializationStep[]
  error: string | null
  startTime: Date | null
  endTime: Date | null
}

/**
 * 初始化状态管理组合式函数
 */
export function useInitializationState() {
  const state = reactive<InitializationState>({
    isInitializing: false,
    currentStep: '',
    progress: 0,
    steps: [],
    error: null,
    startTime: null,
    endTime: null
  })

  const isVisible = computed(() => state.isInitializing)
  const duration = computed(() => {
    if (!state.startTime) return 0
    const endTime = state.endTime || new Date()
    return Math.round((endTime.getTime() - state.startTime.getTime()) / 1000)
  })

  /**
   * 开始初始化
   */
  const startInitialization = (steps: string[] = []) => {
    state.isInitializing = true
    state.currentStep = '准备中...'
    state.progress = 0
    state.error = null
    state.startTime = new Date()
    state.endTime = null
    
    // 初始化步骤
    state.steps = steps.map((label, index) => ({
      id: `step-${index}`,
      label,
      completed: false,
      active: false
    }))
  }

  /**
   * 更新当前步骤
   */
  const updateStep = (stepLabel: string, progress?: number) => {
    state.currentStep = stepLabel
    if (progress !== undefined) {
      state.progress = Math.min(100, Math.max(0, progress))
    }

    // 更新步骤状态
    const currentStepIndex = state.steps.findIndex(step => step.label === stepLabel)
    if (currentStepIndex >= 0) {
      // 将之前的步骤标记为完成
      state.steps.forEach((step, index) => {
        if (index < currentStepIndex) {
          step.completed = true
          step.active = false
        } else if (index === currentStepIndex) {
          step.active = true
          step.completed = false
        } else {
          step.active = false
          step.completed = false
        }
      })
    }
  }

  /**
   * 完成某个步骤
   */
  const completeStep = (stepLabel: string) => {
    const step = state.steps.find(s => s.label === stepLabel)
    if (step) {
      step.completed = true
      step.active = false
    }

    // 计算进度
    const completedSteps = state.steps.filter(s => s.completed).length
    const totalSteps = state.steps.length
    if (totalSteps > 0) {
      state.progress = Math.round((completedSteps / totalSteps) * 100)
    }
  }

  /**
   * 设置步骤错误
   */
  const setStepError = (stepLabel: string, error: string) => {
    const step = state.steps.find(s => s.label === stepLabel)
    if (step) {
      step.error = error
      step.active = false
    }
  }

  /**
   * 完成初始化
   */
  const completeInitialization = (success: boolean = true, error?: string) => {
    state.endTime = new Date()
    
    if (success) {
      state.progress = 100
      state.currentStep = '初始化完成'
      // 标记所有步骤为完成
      state.steps.forEach(step => {
        if (!step.error) {
          step.completed = true
          step.active = false
        }
      })

      // 延迟隐藏加载器
      setTimeout(() => {
        state.isInitializing = false
      }, 1000)
    } else {
      state.error = error || '初始化失败'
      state.currentStep = '初始化失败'
    }
  }

  /**
   * 重置状态
   */
  const resetState = () => {
    state.isInitializing = false
    state.currentStep = ''
    state.progress = 0
    state.steps = []
    state.error = null
    state.startTime = null
    state.endTime = null
  }

  /**
   * 重试初始化
   */
  const retryInitialization = () => {
    resetState()
    // 这里可以触发重新初始化的逻辑
  }

  return {
    // 状态
    state,
    isVisible,
    duration,
    
    // 方法
    startInitialization,
    updateStep,
    completeStep,
    setStepError,
    completeInitialization,
    resetState,
    retryInitialization
  }
}

// 全局初始化状态实例
let globalInitState: ReturnType<typeof useInitializationState> | null = null

/**
 * 获取全局初始化状态
 */
export function useGlobalInitializationState() {
  if (!globalInitState) {
    globalInitState = useInitializationState()
  }
  return globalInitState
}
