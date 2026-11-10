/*
 * Configuração da página. Edite só este arquivo.
 *
 * SUPABASE: sem url/anonKey o site roda em MODO DEMONSTRAÇÃO — os leads ficam
 * salvos apenas no navegador de quem preencheu e NÃO aparecem no painel do Mateus.
 * Para produção, crie o projeto no Supabase, rode supabase/schema.sql e preencha abaixo.
 */
window.SITE_CONFIG = {
  supabase: {
    url: "",      // ex.: "https://xxxx.supabase.co"
    anonKey: ""   // chave "anon public" do projeto (é pública por design; a segurança vem do RLS)
  },

  // Só dígitos, com DDI + DDD. Ex.: "5569999999999"
  whatsapp: "",
  whatsappMsg: "Oi Mateus, vim pela sua página e quero conversar sobre minhas vendas.",

  links: {
    instagram: "https://www.instagram.com/",   // troque pelo @ do Mateus
    hollmind: "https://hollmind.com/",
    stark: "#aplicar"                           // link da página da Mentoria Stark, se existir
  },

  // Senha do painel APENAS no modo demonstração (sem Supabase). Não é segurança real.
  demoPanelPassword: "stark2026"
};
