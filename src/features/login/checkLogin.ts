// Owner: Integrator.
import { createGreenApiClient, GreenApiError } from '../../api/greenApi'
import type { Credentials, InstanceState } from '../../types'

const STATE_ERRORS: Record<Exclude<InstanceState, 'authorized'>, string> = {
  notAuthorized: 'Инстанс не авторизован: привяжите аккаунт в консоли GREEN-API',
  blocked: 'Аккаунт инстанса заблокирован',
  starting: 'Инстанс запускается, попробуйте через минуту',
  yellowCard: 'Отправка с инстанса временно ограничена мессенджером',
  unknown: 'Не удалось определить состояние инстанса',
}

/**
 * Validates credentials with getStateInstance.
 * Resolves to null when the instance is authorized, otherwise to an error message for the user.
 */
export async function checkLogin(credentials: Credentials): Promise<string | null> {
  try {
    const state = await createGreenApiClient(credentials).getStateInstance()
    return state === 'authorized' ? null : STATE_ERRORS[state]
  } catch (error) {
    if (error instanceof GreenApiError) return error.message
    return 'Не удалось войти: проверьте apiUrl и подключение к интернету'
  }
}
