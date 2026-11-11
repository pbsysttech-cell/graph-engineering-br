# Página pessoal · Mateus Oliveira

Página em HTML/CSS/JS + painel de leads. Os leads ficam no **MySQL da própria Hostinger**, gravados por uma API pequena em PHP.

| Arquivo | O que é |
|---|---|
| `index.html` | Página pública com o formulário em 4 etapas |
| `admin.html` | Painel de leads: login, números, gráfico, lista com filtros, funil arrastável, ficha do lead com WhatsApp pronto, anotações, valor e CSV |
| `public/api/config.php` | **Servidor:** dados do banco MySQL e usuário/senha do painel |
| `public/api/leads.php`, `auth.php` | API: recebe o formulário, lista/edita/exclui leads (só com login) |
| `public/assets/js/config.js` | **Página:** WhatsApp, Instagram, link da Stark |
| `public/assets/js/store.js` | Envia/lê os leads (PHP, Supabase ou demonstração) e calcula a pontuação |

## Colocar no ar na Hostinger (PHP + MySQL)

1. **hPanel → Bancos de dados → MySQL:** crie um banco e um usuário. Anote nome do banco, usuário e senha.
2. Abra `public/api/config.php` e preencha `DB_NAME`, `DB_USER`, `DB_PASS` (host normalmente `localhost`), troque `ADMIN_PASSWORD` por uma senha forte (mínimo 10 caracteres) e mude o texto de `IP_SALT`.
3. Em `public/assets/js/config.js`, preencha `whatsapp` (só dígitos, com 55 + DDD) e `links.instagram`.
4. Gere a versão final: `npm install` e `npm run build` (ou use a pasta `site-pronto-public_html` que vem no zip de entrega, editando nela os mesmos dois arquivos: `api/config.php` e `assets/js/config.js`).
5. **hPanel → Gerenciador de Arquivos → `public_html`:** envie o conteúdo de `dist/` (index.html, admin.html, assets, api, robots.txt). Mostre arquivos ocultos para conferir que `api/.htaccess` subiu.
6. Abra o site, envie um lead de teste e entre no painel em `seusite.com.br/admin.html` com o usuário e a senha do passo 2.

A tabela é criada sozinha no primeiro envio. Não precisa rodar SQL.

**Importante:** use a hospedagem comum (`public_html`). A opção "Aplicativo Node.js / framework" da Hostinger não executa PHP, então o formulário não salvaria.

### Alternativas
- **Supabase:** deixe `api: ""` em `config.js` e siga `supabase/schema.sql` (preencha `supabase.url` e `supabase.anonKey`).
- **Sem nada configurado** (`api` vazio e sem Supabase): modo demonstração, os leads ficam só no navegador de quem preencheu. Serve para testar, não para produção.

## Segurança

- Visitante só consegue **enviar** lead (sempre como "novo", com consentimento LGPD). Listar, editar e excluir exige login no painel.
- Login com sessão em cookie protegido (HttpOnly, SameSite=Strict); 5 senhas erradas bloqueiam por 10 minutos.
- Anti-spam: campo escondido para robôs e no máximo 5 envios por IP a cada 10 minutos (o IP é guardado só como código, não o número).
- `api/config.php` e `api/_lib.php` são bloqueados no navegador pelo `.htaccess`.
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
