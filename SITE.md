# Página pessoal · Mateus Oliveira

Site estático (HTML/CSS/JS puro, sem build) + painel de leads.

| Arquivo | O que é |
|---|---|
| `index.html` | Página pública: hero com foto montada por blocos, links (Consultoria Hollmind, Mentoria Stark, Instagram, WhatsApp), bio, resultados, caminho da venda e formulário em 4 etapas |
| `admin.html` | Painel de leads: login, KPIs, leads por dia, origem (UTM), faturamento, lista com busca e filtros, funil arrastável, ficha do lead com WhatsApp pronto, anotações, valor do contrato e exportação CSV |
| `assets/js/config.js` | **Único arquivo para editar**: Supabase, WhatsApp, Instagram, link da Stark |
| `assets/js/store.js` | Camada de dados (Supabase ou modo demonstração) e regra de pontuação do lead |
| `supabase/schema.sql` | Tabela `leads` + políticas de segurança (RLS) |

## Colocar no ar

1. **Supabase** (plano grátis serve): crie um projeto, abra o SQL Editor e rode `supabase/schema.sql`.
2. Em *Authentication → Providers → Email*, **desligue "Allow new users to sign up"**.
3. Em *Authentication → Users*, crie o usuário do Mateus (e-mail + senha).
4. No SQL Editor: `insert into public.admins (email) values ('email-do-mateus');`
5. Em `assets/js/config.js`, preencha `supabase.url`, `supabase.anonKey` (Project Settings → API), `whatsapp`, `links.instagram` e, se houver, `links.stark`.
6. Publique a pasta em qualquer hospedagem estática (Vercel, Netlify, Cloudflare Pages, GitHub Pages).
7. Painel: `seusite.com/admin.html`.

Sem Supabase o site funciona em **modo demonstração**: os leads ficam só no navegador de quem preencheu e **não chegam ao painel**. Serve para testar, não para produção.

## Segurança

- Visitante só consegue **inserir** lead (status sempre "novo", com consentimento LGPD). Ler, editar e excluir exige login de um e-mail em `public.admins`.
- Honeypot + tempo mínimo de preenchimento contra robôs simples. Se o spam aparecer, adicione Cloudflare Turnstile.
- Todo texto vindo do formulário é escapado no painel; o CSV neutraliza fórmulas do Excel.

## Rastreamento

Links com `?utm_source=instagram&utm_campaign=...` são gravados no lead e aparecem em "Origem" no painel.

## Animações

Todas em CSS/Web Animations API, sem biblioteca: montagem da foto em blocos (o rosto se forma primeiro), nome subindo por máscara, borda luminosa no card principal, contadores, quadrados com frases rotativas, linha do funil que acompanha a rolagem, etapas do formulário. Quem usa "reduzir movimento" no sistema recebe tudo estático.
