# Prompt para Codex — OpenClaw/Hermes Agent Observatory MVP

## Contexto
Quero criar uma ferramenta privada, em repositório privado do GitHub, chamada provisoriamente **OpenClaw/Hermes Agent Observatory**. Ela será um dashboard web separado, read-only no MVP, para visualizar agentes trabalhando em tempo real no OpenClaw e, no futuro, também no Hermes agent.

O foco inicial é **observabilidade bonita**, não configuração. A UI deve seguir fielmente o design da referência visual entregue em `91483053-c4ba-4b52-8748-a5c0e5c56988.png`: dashboard com 3d isométrico, linhas neon, com agent main centralizado no meio com tom verde em uma região de espaço infinita, sendo dividio em um espaço menor que se expande a medida que novos agentes são adicionados, cada pequeno espaço é cercado das tools/skills/mcps que ficam ligados a linhas brancas no agente que as pode usar, e os outros agentes se ligam com linhas neon brancas ao agente principal. Quando uma tool/skills/mcp/agente é chamado um pulso verde progressivo vai em direção ao objeto e ativa, quando ocorre erro, fica vermelho.

## Premissas do OpenClaw
- O OpenClaw Gateway expõe um WebSocket usado como control plane.
- O Gateway normalmente roda em `127.0.0.1:18789`.
- O primeiro frame do protocolo atual é um `connect`.
- O cliente deve declarar role, scopes e autenticação.
- Para o MVP, usar somente scopes de leitura. Não usar `operator.write` nem `operator.admin`.
- O app precisa funcionar com Gateway local e também com Gateway remoto acessado por SSH tunnel.

## Objetivo do MVP

-> Fase 1:

 - Fazer apenas o frontend, sem integrações, nem backend integrado, apenas o frontend puro para ser testado e validado, não é necessário adicionar .env de configuração, pastas e nenhuma outra configuração que não esteja relacionada ao frontend

-> Fase 2:

  - Depois da Fase 1 ser aprovada completa e aprovada pelo usuário, implementar a lógica de integração com o Openclaw
  


Criar um dashboard web TypeScript, read-only, que:

1. Autentique o usuário do dashboard usando credenciais definidas em `.env`.
2. Conecte ao OpenClaw Gateway local via WebSocket.
3. Conecte a um OpenClaw Gateway remoto via SSH tunnel.
4. Leia eventos/status do Gateway.
5. Normalize eventos em entidades visuais.
6. Mostre agentes, execuções, ferramentas, sessões e eventos em uma interface node-based bonita.
7. Não permita nenhuma ação de escrita, alteração de configuração, restart, tool invocation ou exposição de gateway em rede.
8. Deixe a arquitetura pronta para adicionar Hermes futuramente.

## Stack obrigatória
- TypeScript strict.
- React ou Next.js para `apps/web`.
- Node.js TypeScript para `apps/agent-observatory-adapter`.
- Three.js ou React Three Fiber para o visual node-based principal.
- WebSocket para stream Gateway → adapter.
- Server-Sent Events ou WebSocket interno para adapter → web.
- Zod para validação de env e modelos internos.
- Vitest para unit tests.
- Playwright para e2e básico.
- ESLint + Prettier.
- pnpm workspace.

## Estrutura sugerida

```txt
openclaw-agent-observatory/
  apps/
    web/
      src/
        app/
        components/
        features/
          overview/
          graph/
          agents/
          sessions/
          risks/
        lib/
        styles/
    agent-observatory-adapter/
      src/
        auth/
        connectors/
          openclaw/
          hermes/
        events/
        security/
        ssh/
        server.ts
  packages/
    protocol/
      src/
        connector.ts
        entities.ts
        events.ts
        redaction.ts
    ui/
      src/
        cards/
        layout/
        status/
  docs/
    architecture.md
    security.md
    design-system.md
  tests/
    fixtures/
```

## `.env.example`

```env
# Dashboard web auth. MVP privado, simples e server-side.
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=change-me
DASHBOARD_SESSION_SECRET=replace-with-32-byte-random-secret

# Adapter bind. Nunca usar 0.0.0.0 por padrão.
ADAPTER_HOST=127.0.0.1
ADAPTER_PORT=3317

# OpenClaw local gateway.
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=replace-with-openclaw-token
OPENCLAW_PROTOCOL_MIN=3
OPENCLAW_PROTOCOL_MAX=4
OPENCLAW_CLIENT_ID=openclaw-agent-observatory
OPENCLAW_CLIENT_VERSION=0.1.0

# Modo de conexão: local | ssh
GATEWAY_CONNECTION_MODE=local

# SSH tunnel para gateway remoto.
SSH_HOST=example.internal
SSH_PORT=22
SSH_USERNAME=hendryk
SSH_PRIVATE_KEY_PATH=/Users/hendryk/.ssh/id_ed25519
SSH_LOCAL_HOST=127.0.0.1
SSH_LOCAL_PORT=18790
SSH_REMOTE_HOST=127.0.0.1
SSH_REMOTE_PORT=18789

# Desenvolvimento sem Gateway real.
MOCK_MODE=false
```

## Regras de segurança obrigatórias

### MVP read-only absoluto
Não criar nenhum endpoint de escrita. Não criar botões de apply, restart, config edit, tool invoke, expose gateway ou approve. Caso algum endpoint operacional seja planejado, deve retornar `403` no MVP.

### Conexão segura
- O adapter deve bindar em `127.0.0.1` por padrão.
- Nunca abrir o OpenClaw Gateway em `0.0.0.0`.
- Para acesso remoto, usar SSH tunnel local: browser → adapter local → tunnel SSH → Gateway remoto `127.0.0.1:18789`.
- Não persistir tokens no navegador.
- `OPENCLAW_GATEWAY_TOKEN` só existe no processo server-side do adapter.

### Auth do dashboard
- Implementar login simples por sessão HTTP-only cookie.
- Username/password vêm do `.env`.
- Cookie `httpOnly`, `sameSite=strict`, `secure` quando HTTPS.
- Rate limit no login.
- Nunca logar senha, token, cookie ou Authorization.

### Redaction
Criar função centralizada para remover valores sensíveis de qualquer log/evento:

```ts
const SECRET_KEYS = [
  "apiKey", "api_key", "token", "accessToken", "refreshToken",
  "secret", "password", "privateKey", "authorization", "cookie"
];
```

Qualquer valor desses campos deve aparecer como `"[REDACTED]"`.

### Scopes OpenClaw
No handshake com OpenClaw, solicitar somente leitura:

```ts
scopes: ["operator.read"]
```

Não usar:

```ts
operator.write
operator.admin
operator.approvals
operator.pairing
operator.talk.secrets
```

## Contrato de conectores
A UI não deve depender diretamente do OpenClaw. Criar interface genérica para OpenClaw e Hermes.

```ts
export type ConnectorKind = "openclaw" | "hermes";

export interface AgentConnector {
  id: string;
  kind: ConnectorKind;
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<ConnectorStatus>;
  subscribe(handler: (event: NormalizedAgentEvent) => void): () => void;
}

export interface ConnectorStatus {
  id: string;
  kind: ConnectorKind;
  status: "offline" | "connecting" | "operational" | "degraded";
  latencyMs?: number;
  protocolVersion?: number;
  lastSeenAt?: string;
}
```

Implementar agora:

```ts
OpenClawGatewayConnector
```

Criar apenas stub:

```ts
HermesAgentConnector
```

## Modelo visual normalizado

```ts
export type VisualNodeKind =
  | "gateway"
  | "agent"
  | "session"
  | "task"
  | "tool"
  | "artifact"
  | "memory"
  | "risk"
  | "hermes";

export interface VisualNode {
  id: string;
  label: string;
  kind: VisualNodeKind;
  status: "idle" | "active" | "thinking" | "executing" | "waiting" | "error" | "complete";
  x?: number;
  y?: number;
  z?: number;
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  status: "active" | "completed" | "risk" | "muted";
  label?: string;
  velocity?: number;
  updatedAt: string;
}

export interface NormalizedAgentEvent {
  id: string;
  connectorId: string;
  source: "openclaw" | "hermes";
  type: "health" | "agent" | "session" | "tool" | "message" | "heartbeat" | "risk" | "unknown";
  severity: "debug" | "info" | "warning" | "error";
  ts: string;
  rawType?: string;
  summary: string;
  nodes?: VisualNode[];
  edges?: VisualEdge[];
  safePayload?: Record<string, unknown>;
}
```

## OpenClaw connector — referência de implementação

```ts
import WebSocket from "ws";
import { z } from "zod";
import { redactSecrets } from "@repo/protocol/redaction";

const Env = z.object({
  OPENCLAW_GATEWAY_URL: z.string().url(),
  OPENCLAW_GATEWAY_TOKEN: z.string().min(1),
  OPENCLAW_PROTOCOL_MIN: z.coerce.number().default(3),
  OPENCLAW_PROTOCOL_MAX: z.coerce.number().default(4),
  OPENCLAW_CLIENT_ID: z.string().default("openclaw-agent-observatory"),
  OPENCLAW_CLIENT_VERSION: z.string().default("0.1.0"),
});

export class OpenClawGatewayConnector {
  private ws?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(private readonly env = Env.parse(process.env)) {}

  async connect() {
    this.ws = new WebSocket(this.env.OPENCLAW_GATEWAY_URL, {
      perMessageDeflate: false,
      handshakeTimeout: 10_000,
    });

    this.ws.on("open", () => {
      this.sendConnectFrame();
    });

    this.ws.on("message", (data) => {
      const parsed = this.safeParseFrame(data.toString());
      if (!parsed) return;
      const safeFrame = redactSecrets(parsed);
      const normalized = normalizeOpenClawFrame(safeFrame);
      publishNormalizedEvent(normalized);
    });

    this.ws.on("close", () => this.scheduleReconnect());
    this.ws.on("error", (error) => {
      publishConnectorError(redactSecrets({ message: error.message }));
    });
  }

  private sendConnectFrame() {
    const frame = {
      type: "req",
      id: crypto.randomUUID(),
      method: "connect",
      params: {
        minProtocol: this.env.OPENCLAW_PROTOCOL_MIN,
        maxProtocol: this.env.OPENCLAW_PROTOCOL_MAX,
        client: {
          id: this.env.OPENCLAW_CLIENT_ID,
          version: this.env.OPENCLAW_CLIENT_VERSION,
          platform: process.platform,
          mode: "operator",
        },
        role: "operator",
        scopes: ["operator.read"],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token: this.env.OPENCLAW_GATEWAY_TOKEN },
        locale: "pt-BR",
        userAgent: `${this.env.OPENCLAW_CLIENT_ID}/${this.env.OPENCLAW_CLIENT_VERSION}`,
      },
    };

    this.ws?.send(JSON.stringify(frame));
  }

  private safeParseFrame(raw: string): unknown | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect().catch(() => undefined), 2_000);
  }
}
```

## SSH tunnel — referência de implementação
Preferir usar o binário `ssh` do sistema via `child_process`, sem armazenar chaves no app.

```ts
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";

export interface SshTunnelConfig {
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

export class SshTunnel {
  private proc?: ChildProcessWithoutNullStreams;

  start(config: SshTunnelConfig) {
    if (this.proc) return;

    const target = `${config.username}@${config.host}`;
    const forward = `${config.localHost}:${config.localPort}:${config.remoteHost}:${config.remotePort}`;

    this.proc = spawn("ssh", [
      "-N",
      "-L", forward,
      "-i", config.privateKeyPath,
      "-p", String(config.port),
      "-o", "ExitOnForwardFailure=yes",
      "-o", "ServerAliveInterval=30",
      "-o", "ServerAliveCountMax=3",
      target,
    ], {
      stdio: "pipe",
      env: process.env,
    });

    this.proc.stderr.on("data", (chunk) => {
      publishSshTunnelLog(redactSecrets({ message: chunk.toString() }));
    });

    this.proc.on("exit", (code) => {
      publishSshTunnelStatus({ status: "closed", code });
      this.proc = undefined;
    });
  }

  stop() {
    this.proc?.kill("SIGTERM");
    this.proc = undefined;
  }
}
```

## Design obrigatório
A implementação deve seguir `openclaw_visual_reference.html` como fonte principal de UI.

### Estética
- Dark OS control center.
- Fundo preto quase absoluto: `#030304`, `#050506`, `#09090a`.
- Bordas finas translúcidas: `rgba(255,255,255,.075)`.
- Texto monoespaçado, uppercase, compacto.
- Acento principal verde: `#8cff6a`.
- Erros/riscos em vermelho: `#ff4b4b`.
- Atenção/waiting em amber: `#ffd15e`.
- Informativo em azul: `#8ac9ff`.
- Layout com barra superior, sidebar esquerda, canvas central e cards inferiores.
- Visualização central deve parecer mapa operacional/isométrico/node-based, com nós conectados e rotas animadas.

### Layout
- Header superior com logo, versão, system status, sync e modo local/ssh.
- Sidebar esquerda com:
  - título `AGENT OPS OS`;
  - subtítulo `OBSERVABILITY CENTER`;
  - busca;
  - agentes vivos;
  - navegação.
- Área central com:
  - título `AGENT NETWORK`;
  - subtítulo `REAL-TIME AGENT WORKFLOW MAP`;
  - tabs `GRAPH`, `RUNS`, `TOOLS`, `TRACE`;
  - canvas 3D/node map.
- Cards inferiores:
  - event velocity;
  - agent lifecycle;
  - gateway health.

### Three.js / React Three Fiber
- Renderizar nós como emissive spheres/boxes.
- Gateway como hub central verde.
- Agentes como nós orbitais.
- Ferramentas/sessões como nós menores.
- Edges como curvas com particles/pulses.
- Eventos ativos aumentam glow e velocidade de partícula.
- Riscos aparecem como edge/nó vermelho.
- Estados completos ficam brancos/dim.
- Deve haver fallback 2D/SVG se WebGL falhar.

## Telas do MVP

### `/login`
- Form simples, dark, no mesmo design.
- Usa `DASHBOARD_USERNAME` e `DASHBOARD_PASSWORD`.
- Rate limit.

### `/overview`
- Tela principal.
- Mostra status local/ssh.
- Mostra gateway operacional/degraded/offline.
- Mostra agentes ativos.
- Mostra node map.
- Mostra eventos recentes.

### `/agents`
- Lista read-only de agentes vistos nos eventos.
- Status, última atividade, sessões, ferramentas usadas, erros.

### `/sessions`
- Timeline read-only de sessões/execuções.

### `/risks`
- Eventos de risco ou erro.
- Não oferecer ações operacionais no MVP.

## API interna do adapter

```txt
GET /health
GET /api/session/me
POST /api/session/login
POST /api/session/logout
GET /api/connectors
GET /api/connectors/openclaw/status
GET /api/events/stream
GET /api/snapshot
```

Proibido no MVP:

```txt
POST /api/openclaw/config/apply
POST /api/openclaw/restart
POST /api/openclaw/tools/invoke
POST /api/openclaw/gateway/expose
POST /api/openclaw/approve
```

Se algum desses endpoints existir como placeholder, retornar `403` e logar evento redigido.

## Testes obrigatórios

### Unitários
- `redactSecrets` remove secrets aninhados.
- `normalizeOpenClawFrame` não quebra com frame desconhecido.
- `OpenClawGatewayConnector` envia handshake com `operator.read` apenas.
- `SshTunnel` monta argumentos corretos sem expor token.
- Auth rejeita senha incorreta.

### E2E
- Login funciona.
- Dashboard abre em mock mode.
- Overview mostra `SYSTEM STATUS`.
- Node map renderiza.
- Nenhum controle de escrita aparece.
- Usuário não autenticado é redirecionado para `/login`.

## CI
Criar GitHub Actions:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

## Versionamento
- SemVer.
- Conventional Commits.
- Changesets.
- `main` sempre verde.
- `dev` para integração.
- feature branches por módulo.
- `CHANGELOG.md` obrigatório.

## Entregáveis do primeiro PR
1. Monorepo configurado.
2. `.env.example`.
3. Adapter com auth, mock mode e shape dos endpoints.
4. OpenClaw connector com handshake read-only.
5. SSH tunnel manager.
6. UI `/login` e `/overview`.
7. Node map visual inicial com dados mockados.
8. Design baseado fielmente em `openclaw_visual_reference.html`.
9. Testes unitários básicos.
10. CI configurado.

## Restrições importantes
- Não implementar edição de configuração no MVP.
- Não implementar controles operacionais no MVP.
- Não expor gateway em rede.
- Não armazenar secrets no browser.
- Não usar localStorage para credenciais.
- Não logar tokens.
- Não chamar ferramentas do OpenClaw.
- Não adicionar Hermes real enquanto a API/protocolo não estiver definido.

## Meta final do MVP
Ao rodar localmente, o usuário abre o dashboard, faz login, escolhe conexão local ou SSH conforme `.env`, e vê uma interface bonita no estilo da referência: agentes e processos do OpenClaw aparecem como nós conectados, com fluxos animados, estado do Gateway, eventos em tempo real, métricas e riscos. Tudo read-only.
