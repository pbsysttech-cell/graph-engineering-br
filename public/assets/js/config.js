/*
 * Configuração da página. Edite só este arquivo (e api/config.php no servidor).
 *
 * Onde os leads ficam salvos, em ordem de prioridade:
 *  1) api      -> PHP + MySQL da própria Hostinger (padrão). Configure api/config.php.
 *  2) supabase -> só se "api" estiver vazio e url/anonKey preenchidos.
 *  3) nenhum   -> MODO DEMONSTRAÇÃO: leads ficam só no navegador de quem preencheu.
 */
window.SITE_CONFIG = {
  api: "/api",

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

  // Senha do painel APENAS no modo demonstração (sem PHP nem Supabase). Não é segurança real.
  demoPanelPassword: "stark2026"
};
