# Painel Brandão Solar

Sistema de agenda, solicitações e logística — conectado ao Supabase.

## 1. Testar no seu computador (antes de publicar)

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. O arquivo `.env` já vem com as chaves do seu Supabase —
não precisa configurar nada pra testar local.

## 2. Subir no GitHub

```bash
git init
git add .
git commit -m "Primeira versão do painel"
```

Depois, crie um repositório vazio em https://github.com/new (dê o nome que quiser,
ex: `painel-brandao-solar`, marque como **privado**). O próprio GitHub mostra os
comandos exatos depois de criar — algo como:

```bash
git remote add origin https://github.com/SEU-USUARIO/painel-brandao-solar.git
git branch -M main
git push -u origin main
```

O arquivo `.env` (com suas chaves) **não vai junto** — o `.gitignore` já bloqueia isso
de propósito, por segurança.

## 3. Publicar com link fixo (Vercel)

1. Acesse https://vercel.com e entre com sua conta do GitHub.
2. Clique em **"Add New" → "Project"**.
3. Escolha o repositório `painel-brandao-solar`.
4. Em **Environment Variables**, adicione as duas do arquivo `.env.example`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (copie os valores reais do seu `.env` local)
5. Clique em **Deploy**.

Em cerca de 1 minuto, a Vercel te dá um link fixo, tipo
`painel-brandao-solar.vercel.app` — esse é o endereço definitivo, acessível de
qualquer lugar, sem precisar do Claude aberto.

Toda vez que você (ou eu, a seu pedido) atualizar o código e mandar pro GitHub de
novo, a Vercel republica sozinha, automaticamente.

## Sobre o banco de dados (Supabase)

Duas tabelas: `requests` (solicitações) e `visits` (visitas agendadas). Se um dia
precisar mexer direto nos dados, é em supabase.com → seu projeto → **Table Editor**.
