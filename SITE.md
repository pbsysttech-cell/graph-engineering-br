# Página pessoal · Mateus Oliveira

Site estático (HTML/CSS/JS puro, sem build) + painel de leads.

| Arquivo | O que é |
|---|---|
| `index.html` | Página pública: hero com foto montada por blocos, links (Consultoria Hollmind, Mentoria Stark, Instagram, WhatsApp), bio, resultados, caminho da venda e formulário em 4 etapas |
| `admin.html` | Painel de leads: login, KPIs, leads por dia, origem (UTM), faturamento, lista com busca e filtros, funil arrastável, ficha do lead com WhatsApp pronto, anotações, valor do contrato e exportação CSV |
| `public/assets/js/config.js` | **Único arquivo para editar**: Supabase, WhatsApp, Instagram, link da Stark |
| `public/assets/js/store.js` | Camada de dados (Supabase ou modo demonstração) e regra de pontuação do lead |
| `supabase/schema.sql` | Tabela `leads` + políticas de segurança (RLS) |

## Colocar no ar

1. **Supabase** (plano grátis serve): crie um projeto, abra o SQL Editor e rode `supabase/schema.sql`.
2. Em *Authentication → Providers → Email*, **desligue "Allow new users to sign up"**.
3. Em *Authentication → Users*, crie o usuário do Mateus (e-mail + senha).
4. No SQL Editor: `insert into public.admins (email) values ('email-do-mateus');`
5. Em `public/assets/js/config.js`, preencha `supabase.url`, `supabase.anonKey` (Project Settings → API), `whatsapp`, `links.instagram` e, se houver, `links.stark`.
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

## SEO (o que já está feito e o que falta com o domínio)

Feito na página:
- Título e descrição com as buscas principais ("gestor de tráfego pago", "consultoria de vendas") e o nome do Mateus.
- Dados estruturados (schema.org) dizendo ao Google quem é o Mateus, que ele é cofundador da Hollmind e quais serviços oferece.
- Um único H1 com o nome, textos alternativos nas fotos, idioma pt-BR, imagem principal pré-carregada.
- `robots.txt` liberando o site e bloqueando o painel (`admin.html` também tem `noindex`).

Falta quando o domínio existir (5 minutos):
1. Em `index.html`, trocar `SEU-DOMINIO` e descomentar `canonical` e `og:url`.
2. Trocar `assets/img/og.jpg` por endereço completo (`https://dominio/assets/img/og.jpg`) no `og:image` e no `image` do JSON-LD — WhatsApp e Google só leem imagem com endereço completo.
3. Criar `sitemap.xml` com a URL da página e descomentar a linha no `robots.txt`.
4. Cadastrar o domínio no Google Search Console e enviar o sitemap.
5. Perfil da Empresa no Google (Hollmind) apontando para o site — é o que mais pesa para busca local.

## Publicar na Hostinger

O projeto é **Vite** (na lista de frameworks aceitos). Duas formas:

- **Aplicativo / framework:** envie o zip do projeto, escolha *Vite*, comando `npm run build`, pasta de saída `dist`.
- **Hospedagem comum (public_html):** rode `npm run build` (ou use a pasta já pronta que vem no zip de entrega) e envie o conteúdo de `dist/` para `public_html`.

Para editar: fotos, CSS e JS ficam em `public/assets/`. `npm run dev` abre a página localmente.
