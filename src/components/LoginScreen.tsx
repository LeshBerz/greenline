import { LoginForm, type LoginFormProps } from './LoginForm'
import styles from './LoginScreen.module.css'

/** Full-height page that centers the LoginForm. Same props as LoginForm. */
export function LoginScreen(props: LoginFormProps) {
  return (
    <main className={styles.screen}>
      <LoginForm {...props} />
    </main>
  )
}
