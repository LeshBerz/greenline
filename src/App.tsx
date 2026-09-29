// Owner: Integrator.
import { ChatPage } from './features/chat/ChatPage'
import { LoginPage } from './features/login/LoginPage'
import { useChatStore } from './store/chatStore'

export function App() {
  const credentials = useChatStore((s) => s.credentials)
  return credentials ? <ChatPage credentials={credentials} /> : <LoginPage />
}
