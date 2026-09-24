import { useId, useState, type FormEvent } from 'react'
import type { Credentials } from '../types'
import { EyeIcon, EyeOffIcon, LogoIcon } from './icons'
import styles from './LoginForm.module.css'

export const DEFAULT_API_URL = 'https://api.green-api.com'

export interface LoginFormProps {
  onSubmit(credentials: Credentials): void
  loading?: boolean
  /** Error from the login attempt (e.g. wrong credentials), shown above the button. */
  error?: string
  /** Prefill, e.g. from a previous session. apiUrl falls back to DEFAULT_API_URL. */
  initialValues?: Partial<Credentials>
}

type Field = keyof Credentials
type FieldErrors = Partial<Record<Field, string>>

const REQUIRED_MESSAGES: Record<Field, string> = {
  apiUrl: 'Укажите apiUrl',
  idInstance: 'Укажите idInstance',
  apiTokenInstance: 'Укажите apiTokenInstance',
}

export function LoginForm({ onSubmit, loading = false, error, initialValues }: LoginFormProps) {
  const id = useId()
  const [values, setValues] = useState<Credentials>({
    apiUrl: initialValues?.apiUrl ?? DEFAULT_API_URL,
    idInstance: initialValues?.idInstance ?? '',
    apiTokenInstance: initialValues?.apiTokenInstance ?? '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showToken, setShowToken] = useState(false)

  function change(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: undefined }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    const trimmed: Credentials = {
      apiUrl: values.apiUrl.trim(),
      idInstance: values.idInstance.trim(),
      apiTokenInstance: values.apiTokenInstance.trim(),
    }
    const errors: FieldErrors = {}
    for (const field of Object.keys(REQUIRED_MESSAGES) as Field[]) {
      if (!trimmed[field]) errors[field] = REQUIRED_MESSAGES[field]
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      document.getElementById(`${id}-${Object.keys(errors)[0]}`)?.focus()
      return
    }
    onSubmit(trimmed)
  }

  function renderField(field: Field, label: string, hint?: string) {
    const inputId = `${id}-${field}`
    const errorId = `${inputId}-error`
    const isToken = field === 'apiTokenInstance'
    const fieldError = fieldErrors[field]
    return (
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        <div className={styles.inputWrap}>
          <input
            id={inputId}
            className={styles.input}
            type={isToken && !showToken ? 'password' : 'text'}
            inputMode={field === 'idInstance' ? 'numeric' : undefined}
            autoComplete="off"
            spellCheck={false}
            value={values[field]}
            onChange={(e) => change(field, e.target.value)}
            disabled={loading}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? errorId : undefined}
            placeholder={hint}
          />
          {isToken && (
            <button
              type="button"
              className={styles.reveal}
              onClick={() => setShowToken((s) => !s)}
              aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
              aria-pressed={showToken}
              title={showToken ? 'Скрыть' : 'Показать'}
            >
              {showToken ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          )}
        </div>
        {fieldError && (
          <p id={errorId} className={styles.fieldError}>
            {fieldError}
          </p>
        )}
      </div>
    )
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate aria-busy={loading}>
      <div className={styles.brand}>
        <LogoIcon size={48} />
        <h1 className={styles.title}>Greenline</h1>
        <p className={styles.subtitle}>Войдите с данными инстанса из консоли GREEN-API</p>
      </div>

      {renderField('apiUrl', 'apiUrl', DEFAULT_API_URL)}
      {renderField('idInstance', 'idInstance', '1101000000')}
      {renderField('apiTokenInstance', 'apiTokenInstance')}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading && <span className={styles.spinner} aria-hidden="true" />}
        {loading ? 'Вход…' : 'Войти'}
      </button>
    </form>
  )
}
