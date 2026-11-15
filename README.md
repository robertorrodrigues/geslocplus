# GesLocPlus

Aplicação React/Vite com API Node.js/Express e persistência PostgreSQL.

## Configuração local

1. Instale o Node.js 22 ou superior e o PostgreSQL.
2. Crie um banco vazio chamado `geslocplus`.
3. Copie `.env.example` para `.env` e configure `DATABASE_URL`. Gere um segredo de sessão com:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

   Copie o resultado para `JWT_SECRET`. Não compartilhe nem versione o arquivo `.env`.
4. Instale as dependências e crie as tabelas:

   ```sh
   npm install
   npm run db:schema
   ```

5. Cadastre primeiro um proprietário administrador em `proprietarios_adm`. Depois crie o acesso vinculado ao ID desse cadastro; a senha é solicitada sem aparecer na tela:

   ```sh
   npm run create-admin
   ```

   O app não permite cadastro público. Somente usuários vinculados a `proprietarios_adm` podem entrar no sistema.
   Para redefinir a senha de uma conta existente, use `npm run reset-password`. O comando verifica o vínculo e grava a senha em bcrypt; a nova senha deve ter pelo menos 12 caracteres.
6. Inicie o frontend e a API:

   ```sh
   npm run dev
   ```

   O frontend usa `http://localhost:8443` por padrão e encaminha `/api` para a API na porta `3001`. A porta da API pode ser alterada com `API_PORT`.

   Se o Figma Make já estiver executando o frontend em `8443`, inicie apenas a API com `npm run dev:api`. Se uma instância saudável da API já estiver na porta `3001`, ela será reutilizada.

## Scripts

- `npm run db:schema` — cria as tabelas definidas em `database/schema.sql`.
- `npm run create-admin` — cria um usuário vinculado a um registro de `proprietarios_adm`.
- `npm run reset-password` — redefine com segurança a senha de uma conta existente elegível.
- `npm run dev` — inicia Vite e API em modo de desenvolvimento.
- `npm run build` — gera a versão de produção do frontend.
- `npm run typecheck` — verifica os tipos de frontend, API e scripts.
- `npm start` — inicia somente a API; configure um proxy reverso para servir `/api` na mesma origem do frontend.

Em produção, defina `NODE_ENV=production`, `APP_ORIGIN` com a origem exata do frontend, `DATABASE_URL`, `JWT_SECRET` e `API_PORT`. A sessão usa cookie HttpOnly, SameSite=Lax e Secure em produção.

## Modelo de dados

O schema contém as tabelas `agendas`, `bancos`, `checklists`, `checklist_items`, `equipamentos`, `equipamentos_fotos`, `imoveis`, `prepostos`, `prestadores_servico`, `proprietarios_adm`, `proprietarios_adm_imoveis`, `tarefas` e `usuarios`. Ao cadastrar um imóvel, selecione um ou mais proprietários administradores; o imóvel e os vínculos (`proprietarios_adm_id`, `imoveis_id`) são salvos em uma única transação. Cada usuário autenticado vê apenas os imóveis vinculados ao proprietário administrador indicado por `usuarios.pessoa_id`. A imagem opcional da capa é armazenada no PostgreSQL (`imoveis.image_data` e `image_mime_type`); JPEG, PNG e WebP são aceitos até 5 MB. Na edição do imóvel, use **Gerenciar equipamentos** para incluir, alterar ou remover equipamentos e gerenciar suas fotos. Cada equipamento aceita até 10 fotos JPEG, PNG ou WebP, de até 5 MB cada, armazenadas em `equipamentos_fotos`. Execute `npm run db:schema` para criar/atualizar as tabelas e colunas necessárias no banco existente. Reservas, ocupação, receita, vínculos de prestadores com imóveis e atribuição de tarefas a imóveis não estão disponíveis no app.

## API

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/dashboard`
- `GET|POST /api/properties`, `GET /api/properties/:id`, `PATCH /api/properties/:id`, `GET /api/properties/:id/image`
- `GET|POST /api/properties/:propertyId/equipment`, `PATCH|DELETE /api/properties/:propertyId/equipment/:equipmentId`
- `POST /api/properties/:propertyId/equipment/:equipmentId/photos`, `GET|DELETE /api/properties/:propertyId/equipment/:equipmentId/photos/:photoId`
- `GET|POST /api/people`
- `GET|POST /api/tasks`, `PATCH /api/tasks/:id`
- `GET|POST /api/checklists`
- `GET /api/health`

As rotas operacionais exigem sessão autenticada e são restritas a usuários cujo `tipo_pessoa` seja `proprietario_adm`.
