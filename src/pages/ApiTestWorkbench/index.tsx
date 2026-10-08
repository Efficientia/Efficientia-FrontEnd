import { useCallback, useState, type FormEvent } from 'react';
import { authService, getBaseUrl } from '../../services';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuth } from '../../hooks/useAuth';
import { isValidBrazilianLicensePlate, isValidCpfFormat } from '../../utils/validators';
import type { LoginRequest } from '../../types/auth';
import './ApiTestWorkbench.css';

export function ApiTestWorkbench() {
  const { loginFuncionario } = useAuth();
  const [cpf, setCpf] = useState('');
  const [cpfTouched, setCpfTouched] = useState(false);
  const [plate, setPlate] = useState('');
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
    if (!isValidCpfFormat(cpf)) {
      setCpfTouched(true);
      document.getElementById('api-test-cpf')?.focus();
      return;
    }

    const fields = new FormData(event.currentTarget);
    void login.execute({
      cpf,
      email: String(fields.get('email') ?? '').trim(),
      senha: String(fields.get('senha') ?? ''),
      codigoEmpresa: String(fields.get('codigoEmpresa') ?? '').trim(),
    });
  };

  return (
    <main id="main-content" className="api-workbench" tabIndex={-1}>
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
        <form onSubmit={handleLogin}>
          <div className="api-workbench__field">
            <label htmlFor="api-test-cpf">CPF</label>
            <input
              id="api-test-cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={11}
              value={cpf}
              onChange={(event) => setCpf(event.target.value.replace(/\D/g, ''))}
              onBlur={() => setCpfTouched(true)}
              aria-invalid={cpfTouched && !isValidCpfFormat(cpf)}
              aria-describedby={cpfTouched && !isValidCpfFormat(cpf)
                ? 'api-test-cpf-help api-test-cpf-error'
                : 'api-test-cpf-help'}
              required
            />
            <span id="api-test-cpf-help" className="api-workbench__hint">
              Informe 11 dígitos, sem pontuação.
            </span>
            {cpfTouched && !isValidCpfFormat(cpf) && (
              <span className="api-workbench__error" id="api-test-cpf-error">
                O CPF deve conter exatamente 11 dígitos.
              </span>
            )}
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
      <section className="api-workbench__card" aria-labelledby="plate-heading">
        <h2 id="plate-heading">Validação de placa</h2>
        <p>Confere o formato brasileiro antigo (ABC1234) e Mercosul (ABC1D23).</p>
        <div className="api-workbench__field">
          <label htmlFor="api-test-plate">Placa do veículo</label>
          <input
            id="api-test-plate"
            type="text"
            autoComplete="off"
            maxLength={7}
            value={plate}
            onChange={(event) => setPlate(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            aria-invalid={plate.length > 0 && !isValidBrazilianLicensePlate(plate)}
            aria-describedby="api-test-plate-help api-test-plate-result"
          />
          <span id="api-test-plate-help" className="api-workbench__hint">
            Digite sete caracteres alfanuméricos.
          </span>
          <span
            id="api-test-plate-result"
            className={plate.length === 0
              ? 'api-workbench__hint'
              : isValidBrazilianLicensePlate(plate)
                ? 'api-workbench__success'
                : 'api-workbench__error'}
            role="status"
            aria-live="polite"
          >
            {plate.length === 0
              ? ''
              : isValidBrazilianLicensePlate(plate)
                ? 'Formato de placa válido.'
                : 'Formato inválido. Use ABC1234 ou ABC1D23.'}
          </span>
        </div>
      </section>
    </main>
  );
}
