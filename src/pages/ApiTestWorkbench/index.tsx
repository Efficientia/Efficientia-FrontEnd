import { useCallback, type FormEvent } from 'react';
import { authService, getBaseUrl } from '../../services';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuth } from '../../hooks/useAuth';
import type { LoginRequest } from '../../types/auth';
import './ApiTestWorkbench.css';

export function ApiTestWorkbench() {
  const { loginFuncionario } = useAuth();
  const loadStatus = useCallback(() => authService.verificarStatusApi(), []);
  const submitLogin = useCallback(
    async (request: LoginRequest) => {
      await loginFuncionario(request);
      return 'Autenticação concluída. O token foi armazenado na sessão do aplicativo.';
    },
    [loginFuncionario]
  );
  const status = useAsyncAction(loadStatus);
  const login = useAsyncAction(submitLogin);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void login.execute({
      cpf: String(fields.get('cpf') ?? '').replace(/\D/g, ''),
      email: String(fields.get('email') ?? '').trim(),
      senha: String(fields.get('senha') ?? ''),
      codigoEmpresa: String(fields.get('codigoEmpresa') ?? '').trim(),
    });
  };

  return (
    <main className="api-workbench">
      <header className="api-workbench__header">
        <p className="api-workbench__eyebrow">Ambiente de desenvolvimento</p>
        <h1>Testes da API Efficientia</h1>
        <p>
          Ferramentas temporárias para conferir conectividade e autenticação. Esta rota só é
          incluída no build de desenvolvimento.
        </p>
        <dl className="api-workbench__target">
          <dt>API configurada</dt>
          <dd><code>{getBaseUrl()}</code></dd>
        </dl>
      </header>

      <section className="api-workbench__card" aria-labelledby="status-heading">
        <h2 id="status-heading">Status público</h2>
        <p>Consulta GET <code>/api/v1/status</code> sem exigir token.</p>
        <button type="button" onClick={() => void status.execute()} disabled={status.isLoading}>
          {status.isLoading ? 'Consultando…' : 'Testar conexão'}
        </button>
        {status.isError && <p className="api-workbench__error" role="alert">{status.error}</p>}
        {status.isSuccess && status.data && (
          <div className="api-workbench__result" role="status" aria-live="polite">
            <p>API respondeu: {status.data.status}</p>
            <dl>
              <dt>Aplicação</dt><dd>{status.data.nome}</dd>
              <dt>Versão</dt><dd>{status.data.versao}</dd>
            </dl>
          </div>
        )}
      </section>

      <section className="api-workbench__card" aria-labelledby="login-heading">
        <h2 id="login-heading">Login de usuário operacional</h2>
        <p>Testa POST <code>/api/v1/auth/login</code>; CPF, e-mail, senha e código da empresa são obrigatórios.</p>
        <form onSubmit={handleLogin} noValidate>
          <div className="api-workbench__field">
            <label htmlFor="api-test-cpf">CPF</label>
            <input id="api-test-cpf" name="cpf" type="text" inputMode="numeric" autoComplete="off" required />
          </div>
          <div className="api-workbench__field">
            <label htmlFor="api-test-email">E-mail</label>
            <input id="api-test-email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="api-workbench__field">
            <label htmlFor="api-test-password">Senha</label>
            <input id="api-test-password" name="senha" type="password" autoComplete="current-password" required />
          </div>
          <div className="api-workbench__field">
            <label htmlFor="api-test-company">Código da empresa</label>
            <input id="api-test-company" name="codigoEmpresa" type="text" autoComplete="organization" required />
          </div>
          {login.isError && <p className="api-workbench__error" role="alert">{login.error}</p>}
          {login.isSuccess && <p className="api-workbench__success" role="status" aria-live="polite">{login.data}</p>}
          <button type="submit" disabled={login.isLoading}>
            {login.isLoading ? 'Autenticando…' : 'Testar login'}
          </button>
        </form>
      </section>
    </main>
  );
}
