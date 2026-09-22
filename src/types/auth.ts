// export type TipoUsuario = 'MOTORISTA' | 'ANALISTA' | 'ADM_EMPRESA' | 'SISTEMA_DEV'; // Exemplo, ajuste conforme seu Enum Java

export interface UsuarioResponse {
  id: number;              // No Java: Integer
  tipo: string;            // No Java: TipoUsuario (Enum convertido pra string no JSON)
  cpf: string;             // No Java: String
  codigoInterno: string;   // No Java: String
  nome: string;            // No Java: String
  dataNascimento: string;  // No Java: LocalDate (no JSON viaja no formato "YYYY-MM-DD")
  email: string;           // No Java: String
  telefone: string;        // No Java: String
  ativo: boolean;          // No Java: Boolean
}

export interface LoginRequest {
  cpf: string;             // No Java: String
  email: string;           // No Java: String
  senha: string;           // No Java: String
  codigoEmpresa: string;   // No Java: String
}

export interface LoginResponse {
  token: string;           // No Java: String
  tokenType: string;       // No Java: String
  usuario: UsuarioResponse; // Referência à interface acima
}

export interface SignupRequest {
  tipo: string;
  cpf: string;
  codigoInterno: string;
  nome: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  senha: string;
}
