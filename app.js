(() => {
  "use strict";

  // ============================================================
  // SUPABASE
  // ============================================================

  const SUPABASE_URL = "https://quynfezhabxidxkoisel.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_fMsKTSZiWGdx439-DBxPuQ_qk0CUPPt";

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
  );

  console.log("Supabase conectado:", supabase);

  // ============================================================
  // DADOS PADRÃO
  // ============================================================

  const defaults = {
    clients: [],

    flavors: [
      {
        id: "f1",
        name: "Brigadeiro",
        description: "Chocolate cremoso e granulado",
      },
      {
        id: "f2",
        name: "Beijinho",
        description: "Coco com muito carinho",
      },
      {
        id: "f3",
        name: "Maracujá",
        description: "Doce com toque azedinho",
      },
    ],

    sales: [],

    sellers: [
      {
        id: "seller1",
        name: "Vendedora 1",
      },
      {
        id: "seller2",
        name: "Vendedora 2",
      },
    ],

    sellerReports: [],

    promos: {
      one: false,
      two: false,
      three: false,
    },
  };

  // ============================================================
  // ESTADO DA APLICAÇÃO
  // ============================================================

  let data = structuredClone(defaults);

  let currentUser = null;

  let pendingSellerAttribution = null;

  // ============================================================
  // SELETORES
  // ============================================================

  const $ = (selector, root = document) => {
    return root.querySelector(selector);
  };

  const $$ = (selector, root = document) => {
    return [...root.querySelectorAll(selector)];
  };

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  const esc = (value) => {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  };

  const money = (value) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const todayKey = () => {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const dateLabel = (value) => {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  function toast(message) {
    const element = $("#toast");

    if (!element) {
      return;
    }

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      element.classList.remove("show");
    }, 2600);
  }

  // ============================================================
  // AUTENTICAÇÃO
  // ============================================================

  function createLoginScreen() {
    if ($("#supabase-login-screen")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "supabase-login-style";

    style.textContent = `
            #supabase-login-screen {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                background: #fff8f2;
            }

            #supabase-login-card {
                width: min(420px, 100%);
                background: #ffffff;
                border-radius: 24px;
                padding: 32px;
                box-shadow: 0 20px 60px rgba(56, 37, 31, .12);
            }

            #supabase-login-card h1 {
                margin: 0 0 8px;
                color: #38251f;
                font-size: 28px;
            }

            #supabase-login-card p {
                margin: 0 0 24px;
                color: #95847d;
            }

            #supabase-login-card label {
                display: block;
                margin-bottom: 16px;
                color: #38251f;
                font-weight: 600;
            }

            #supabase-login-card input {
                display: block;
                width: 100%;
                box-sizing: border-box;
                margin-top: 7px;
                padding: 13px 14px;
                border: 1px solid #eadbd4;
                border-radius: 12px;
                outline: none;
                font: inherit;
            }

            #supabase-login-card input:focus {
                border-color: #d89a7c;
            }

            #supabase-login-button {
                width: 100%;
                border: 0;
                border-radius: 12px;
                padding: 14px;
                background: #38251f;
                color: #ffffff;
                cursor: pointer;
                font: inherit;
                font-weight: 700;
            }

            #supabase-login-error {
                display: none;
                margin-top: 14px;
                color: #b33a3a;
                font-size: 14px;
            }

            #supabase-logout-button {
                margin-left: 10px;
                border: 0;
                background: transparent;
                color: #95847d;
                cursor: pointer;
                font: inherit;
            }
        `;

    document.head.appendChild(style);

    const screen = document.createElement("div");

    screen.id = "supabase-login-screen";

    screen.innerHTML = `
            <div id="supabase-login-card">
                <h1>P&M Doces</h1>
                <p>Entre para acessar o sistema de vendas.</p>

                <form id="supabase-login-form">

                    <label>
                        E-mail
                        <input
                            id="supabase-login-email"
                            type="email"
                            autocomplete="email"
                            required
                            placeholder="seu@email.com"
                        >
                    </label>

                    <label>
                        Senha
                        <input
                            id="supabase-login-password"
                            type="password"
                            autocomplete="current-password"
                            required
                            placeholder="Sua senha"
                        >
                    </label>

                    <button
                        id="supabase-login-button"
                        type="submit"
                    >
                        Entrar
                    </button>

                    <div id="supabase-login-error"></div>

                </form>
            </div>
        `;

    document.body.appendChild(screen);

    $("#supabase-login-form").addEventListener("submit", handleLogin);
  }

  async function handleLogin(event) {
    event.preventDefault();

    const email = $("#supabase-login-email").value.trim();
    const password = $("#supabase-login-password").value;

    const button = $("#supabase-login-button");
    const error = $("#supabase-login-error");

    button.disabled = true;
    button.textContent = "Entrando...";

    error.style.display = "none";

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      error.textContent = authError.message;
      error.style.display = "block";

      button.disabled = false;
      button.textContent = "Entrar";

      return;
    }

    currentUser = authData.user;

    $("#supabase-login-screen").remove();

    await loadDatabase();

    initializeApplication();
  }

  async function checkAuthentication() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      currentUser = session.user;
      return true;
    }

    return false;
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.reload();
  }

  // ============================================================
  // BANCO DE DADOS
  // ============================================================

  async function loadDatabase() {
    try {
      const [
        clientsResult,
        flavorsResult,
        sellersResult,
        salesResult,
        saleItemsResult,
        reportsResult,
        configResult,
      ] = await Promise.all([
        supabase.from("clientes").select("*").order("id"),

        supabase.from("sabores").select("*").order("id"),

        supabase.from("vendedoras").select("*").order("id"),

        supabase.from("vendas").select("*").order("created_at", {
          ascending: false,
        }),

        supabase.from("itens_venda").select("*").order("id"),

        supabase.from("acertos_vendedoras").select("*").order("created_at", {
          ascending: false,
        }),

        supabase.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
      ]);

      if (clientsResult.error) {
        throw clientsResult.error;
      }

      if (flavorsResult.error) {
        throw flavorsResult.error;
      }

      if (sellersResult.error) {
        throw sellersResult.error;
      }

      if (salesResult.error) {
        throw salesResult.error;
      }

      if (saleItemsResult.error) {
        throw saleItemsResult.error;
      }

      if (reportsResult.error) {
        throw reportsResult.error;
      }

      if (configResult.error) {
        throw configResult.error;
      }

      const clients = clientsResult.data || [];
      const flavors = flavorsResult.data || [];
      const sellers = sellersResult.data || [];
      const sales = salesResult.data || [];
      const saleItems = saleItemsResult.data || [];
      const reports = reportsResult.data || [];

      data.clients = clients.map((client) => ({
        id: String(client.id),
        name: client.nome,
        phone: client.telefone || "",
        email: client.email || "",
        sellerId: client.vendedora_id ? String(client.vendedora_id) : "",
      }));

      data.flavors = flavors.map((flavor) => ({
        id: String(flavor.id),
        name: flavor.nome,
        description: flavor.descricao || "",
      }));

      data.sellers = sellers.map((seller) => ({
        id: String(seller.id),
        name: seller.nome,
        active: seller.ativo !== false,
      }));

      data.sales = sales.map((sale) => {
        const items = saleItems
          .filter((item) => String(item.venda_id) === String(sale.id))
          .map((item) => ({
            flavorId: item.sabor_id ? String(item.sabor_id) : "",
            flavorName:
              item.sabor_nome ||
              data.flavors.find(
                (flavor) => String(flavor.id) === String(item.sabor_id),
              )?.name ||
              "Sabor removido",
            qty: Number(item.quantidade || 0),
          }));

        return {
          id: String(sale.id),

          clientId: sale.cliente_id ? String(sale.cliente_id) : "",

          clientName:
            sale.cliente_nome ||
            data.clients.find(
              (client) => String(client.id) === String(sale.cliente_id),
            )?.name ||
            "Cliente removido",

          sellerId: sale.vendedora_id ? String(sale.vendedora_id) : "",

          sellerName:
            sale.vendedora_nome ||
            data.sellers.find(
              (seller) => String(seller.id) === String(sale.vendedora_id),
            )?.name ||
            "",

          items,

          total: Number(sale.total || 0),

          notes: sale.observacoes || "",

          date: sale.created_at,
        };
      });

      data.sellerReports = reports.map((report) => ({
        id: String(report.id),

        sellerId: report.vendedora_id ? String(report.vendedora_id) : "",

        date: report.created_at ? report.created_at.slice(0, 10) : todayKey(),

        items: Array.isArray(report.itens) ? report.itens : [],

        revenue: Number(report.valor_total || 0),

        createdAt: report.created_at,
      }));

      if (configResult.data) {
        data.promos = {
          one: false,
          two: Boolean(configResult.data.promo_two),
          three: Boolean(configResult.data.promo_three),
        };
      } else {
        data.promos = {
          one: false,
          two: false,
          three: false,
        };
      }

      await ensureDefaultData();

      console.log("Banco carregado com sucesso:", data);
    } catch (error) {
      console.error("Erro ao carregar o banco:", error);

      toast("Não foi possível carregar os dados do banco.");

      throw error;
    }
  }

  async function ensureDefaultData() {
    if (!data.flavors.length) {
      for (const flavor of defaults.flavors) {
        const { data: inserted, error } = await supabase
          .from("sabores")
          .insert({
            nome: flavor.name,
            descricao: flavor.description,
            preco: 5,
          })
          .select()
          .single();

        if (error) {
          console.error(error);
          continue;
        }

        data.flavors.push({
          id: String(inserted.id),
          name: inserted.nome,
          description: inserted.descricao || "",
        });
      }
    }

    if (!data.sellers.length) {
      for (const seller of defaults.sellers) {
        const { data: inserted, error } = await supabase
          .from("vendedoras")
          .insert({
            nome: seller.name,
            ativo: true,
          })
          .select()
          .single();

        if (error) {
          console.error(error);
          continue;
        }

        data.sellers.push({
          id: String(inserted.id),
          name: inserted.nome,
          active: true,
        });
      }
    }

    const { data: config } = await supabase
      .from("configuracoes")
      .select("id")
      .eq("id", 1)
      .maybeSingle();

    if (!config) {
      await supabase.from("configuracoes").insert({
        id: 1,
        promo_one: false,
        promo_two: false,
        promo_three: false,
      });
    }
  }

  // ============================================================
  // CLIENTES
  // ============================================================

  async function insertClient(client) {
    const { data: inserted, error } = await supabase
      .from("clientes")
      .insert({
        nome: client.name,
        telefone: client.phone || null,
        email: client.email || null,
        vendedora_id: client.sellerId ? Number(client.sellerId) : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    client.id = String(inserted.id);

    return client;
  }

  async function updateClient(client) {
    const { error } = await supabase
      .from("clientes")
      .update({
        nome: client.name,
        telefone: client.phone || null,
        email: client.email || null,
        vendedora_id: client.sellerId ? Number(client.sellerId) : null,
      })
      .eq("id", Number(client.id));

    if (error) {
      throw error;
    }
  }

  async function deleteClient(clientId) {
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", Number(clientId));

    if (error) {
      throw error;
    }
  }

  // ============================================================
  // SABORES
  // ============================================================

  async function insertFlavor(flavor) {
    const { data: inserted, error } = await supabase
      .from("sabores")
      .insert({
        nome: flavor.name,
        descricao: flavor.description || "",
        preco: 5,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    flavor.id = String(inserted.id);

    return flavor;
  }

  async function updateFlavor(flavor) {
    const { error } = await supabase
      .from("sabores")
      .update({
        nome: flavor.name,
        descricao: flavor.description || "",
      })
      .eq("id", Number(flavor.id));

    if (error) {
      throw error;
    }
  }

  async function deleteFlavor(flavorId) {
    const { error } = await supabase
      .from("sabores")
      .delete()
      .eq("id", Number(flavorId));

    if (error) {
      throw error;
    }
  }

  // ============================================================
  // PROMOÇÕES
  // ============================================================

  async function savePromos() {
    const { error } = await supabase.from("configuracoes").upsert({
      id: 1,
      promo_one: false,
      promo_two: Boolean(data.promos.two),
      promo_three: Boolean(data.promos.three),
    });

    if (error) {
      throw error;
    }
  }

  // ============================================================
  // VENDAS
  // ============================================================

  async function insertSale(sale) {
    const seller = data.sellers.find(
      (item) => String(item.id) === String(sale.sellerId),
    );

    const { data: insertedSale, error } = await supabase
      .from("vendas")
      .insert({
        cliente_id: sale.clientId ? Number(sale.clientId) : null,

        cliente_nome: sale.clientName,

        vendedora_id: seller ? Number(seller.id) : null,

        vendedora_nome: seller ? seller.name : null,

        total: sale.total,

        observacoes: sale.notes || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const averagePrice =
      sale.items.length > 0
        ? sale.total /
          sale.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
        : 0;

    const itemRows = sale.items.map((item) => ({
      venda_id: insertedSale.id,

      sabor_id: item.flavorId ? Number(item.flavorId) : null,

      sabor_nome: item.flavorName,

      quantidade: Number(item.qty),

      preco_unitario: averagePrice,

      subtotal: averagePrice * Number(item.qty),
    }));

    if (itemRows.length) {
      const { error: itemsError } = await supabase
        .from("itens_venda")
        .insert(itemRows);

      if (itemsError) {
        await supabase.from("vendas").delete().eq("id", insertedSale.id);

        throw itemsError;
      }
    }

    sale.id = String(insertedSale.id);
    sale.date = insertedSale.created_at;

    return sale;
  }

  async function deleteSale(saleId) {
    const { error: itemsError } = await supabase
      .from("itens_venda")
      .delete()
      .eq("venda_id", Number(saleId));

    if (itemsError) {
      throw itemsError;
    }

    const { error } = await supabase
      .from("vendas")
      .delete()
      .eq("id", Number(saleId));

    if (error) {
      throw error;
    }
  }

  // ============================================================
  // VENDEDORAS
  // ============================================================

  async function updateSeller(seller) {
    const { error } = await supabase
      .from("vendedoras")
      .update({
        nome: seller.name,
      })
      .eq("id", Number(seller.id));

    if (error) {
      throw error;
    }
  }

  async function insertSeller(seller) {
    const { data: inserted, error } = await supabase
      .from("vendedoras")
      .insert({
        nome: seller.name,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    seller.id = String(inserted.id);
    seller.active = true;

    return seller;
  }

  async function deactivateSeller(sellerId) {
    const { error } = await supabase
      .from("vendedoras")
      .update({
        ativo: false,
      })
      .eq("id", Number(sellerId));

    if (error) {
      throw error;
    }
  }

  async function activateSeller(sellerId) {
    const { error } = await supabase
      .from("vendedoras")
      .update({
        ativo: true,
      })
      .eq("id", Number(sellerId));

    if (error) {
      throw error;
    }
  }

  async function deleteSeller(sellerId) {
    const { error } = await supabase
      .from("vendedoras")
      .delete()
      .eq("id", Number(sellerId));

    if (error) {
      throw error;
    }
  }

  async function insertSellerReport(report) {
    const sold = report.items.reduce(
      (sum, item) => sum + Number(item.qty || 0) - Number(item.returned || 0),
      0,
    );

    const taken = report.items.reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0,
    );

    const returned = report.items.reduce(
      (sum, item) => sum + Number(item.returned || 0),
      0,
    );

    const { data: inserted, error } = await supabase
      .from("acertos_vendedoras")
      .insert({
        vendedora_id: Number(report.sellerId),

        quantidade_recebida: taken,

        quantidade_devolvida: returned,

        quantidade_vendida: sold,

        valor_total: report.revenue,

        itens: report.items,

        observacoes: null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    report.id = String(inserted.id);
    report.createdAt = inserted.created_at;

    return report;
  }

  async function deleteSellerReport(reportId) {
    const { error } = await supabase
      .from("acertos_vendedoras")
      .delete()
      .eq("id", Number(reportId));

    if (error) {
      throw error;
    }
  }

  // ============================================================
  // LOGO
  // ============================================================

  function loadStoreLogo() {
    const candidates = [
      "images/WhatsApp Image 2026-10-08 at 10.02.01.jpeg",
      "images/logo.png",
      "images/logo.jpg",
      "images/logo.jpeg",
      "images/logo.webp",
      "images/logo.svg",
    ];

    let index = 0;

    const tryNext = () => {
      if (index >= candidates.length) {
        return;
      }

      const source = candidates[index++];

      const probe = new Image();

      probe.onload = () => {
        $$(".brand-image,.mobile-logo").forEach((image) => {
          image.src = source;
        });

        const icon = $('link[rel="icon"]');

        if (icon) {
          icon.href = source;
        }
      };

      probe.onerror = tryNext;

      probe.src = source;
    };

    tryNext();
  }

  // ============================================================
  // PROMOÇÕES - TEXTOS
  // ============================================================

  function updatePromoCopy() {
    $$(".promo-row").forEach((row) => {
      const title = $("strong", row);

      if (title && /3ª/.test(title.textContent)) {
        title.textContent = "3 ou mais trufas";
      }
    });

    $$(".price-detail").forEach((row) => {
      const label = $("span", row);

      if (label && /3ª/.test(label.textContent)) {
        label.textContent = "3 ou mais trufas";
      }
    });

    const toggle = $("#promo-three")
      ?.closest(".toggle-row")
      ?.querySelector("span");

    if (toggle) {
      toggle.textContent = "3 ou mais trufas por R$ 4 cada";
    }
  }

  // ============================================================
  // PREÇOS
  // ============================================================

  function priceFor(quantity) {
    if (quantity <= 0) {
      return 0;
    }

    if (quantity >= 3 && data.promos.three) {
      return quantity * 4;
    }

    if (quantity === 2 && data.promos.two) {
      return 9;
    }

    return quantity * 5;
  }

  // ============================================================
  // NAVEGAÇÃO
  // ============================================================

  function setView(name) {
    $$(".view").forEach((view) => {
      view.classList.toggle("active", view.id === `view-${name}`);
    });

    $$(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === name);
    });

    const labels = {
      inicio: "Visão geral",
      vendas: "Cadastrar venda",
      clientes: "Clientes",
      sabores: "Sabores",
      vendedoras: "Vendedoras",
      historico: "Histórico de vendas",
    };

    $("#crumb").textContent = labels[name] || "Visão geral";

    $("#mobile-back-button").classList.toggle("is-hidden", name === "inicio");

    if (name === "vendas") {
      renderSaleForm();
    }

    if (name === "clientes") {
      renderClients();
    }

    if (name === "sabores") {
      renderFlavors();
    }

    if (name === "vendedoras") {
      renderSellerNames();
      renderSellers();
      renderSellerProfiles();
    }

    if (name === "historico") {
      renderHistory();
    }
  }

  // ============================================================
  // VENDAS
  // ============================================================

  function saleDetails(sale) {
    return sale.items
      .map((item) => `${item.qty}× ${item.flavorName}`)
      .join(", ");
  }

  // ============================================================
  // HOME
  // ============================================================

  function renderHome() {
    const todaySales = data.sales.filter(
      (sale) => sale.date.slice(0, 10) === todayKey(),
    );

    $("#stat-today").textContent = todaySales.length;

    $("#stat-revenue").textContent = money(
      todaySales.reduce((total, sale) => total + sale.total, 0),
    );

    $("#stat-clients").textContent = data.clients.length;

    const list = $("#recent-list");

    const rows = [...data.sales]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);

    list.innerHTML = rows.length
      ? rows
          .map(
            (sale) => `
                        <div class="recent-item">
                            <span class="recent-avatar">🍫</span>

                            <div class="recent-main">
                                <strong>
                                    ${esc(sale.clientName)}
                                </strong>

                                <small>
                                    ${esc(saleDetails(sale))}
                                    ·
                                    ${dateLabel(sale.date)}
                                </small>
                            </div>

                            <span class="recent-price">
                                ${money(sale.total)}
                            </span>
                        </div>
                    `,
          )
          .join("")
      : `
                <div class="empty-state">
                    Suas vendas recentes aparecerão aqui. 🍫
                </div>
            `;
  }

  // ============================================================
  // CLIENTES
  // ============================================================

  function renderClients() {
    const query = ($("#client-search").value || "").toLowerCase();

    const clients = data.clients.filter((client) =>
      `${client.name} ${client.phone} ${client.email}`
        .toLowerCase()
        .includes(query),
    );

    $("#client-count").textContent = `${data.clients.length} ${
      data.clients.length === 1 ? "cliente" : "clientes"
    }`;

    const list = $("#client-list");

    list.innerHTML = clients.length
      ? clients
          .map(
            (client) => `
                        <div class="table-row">

                            <span class="recent-avatar">
                                ♙
                            </span>

                            <div class="table-row-main">

                                <strong>
                                    ${esc(client.name)}
                                </strong>

                                <small>
                                    ${esc(client.email || "Sem e-mail")}
                                    ·
                                    ${esc(client.phone || "Sem telefone")}
                                </small>

                            </div>

                            <span class="row-meta">
                                ${
                                  data.sales.filter(
                                    (sale) => sale.clientId === client.id,
                                  ).length
                                }
                                vendas
                            </span>

                            <button
                                class="mini-button"
                                data-edit-client="${esc(client.id)}"
                            >
                                Editar
                            </button>

                            <button
                                class="mini-button"
                                data-delete-client="${esc(client.id)}"
                            >
                                Excluir
                            </button>

                        </div>
                    `,
          )
          .join("")
      : `
                <div class="empty-state">
                    Nenhum cliente por aqui ainda.
                    Cadastre seu primeiro cliente! ♡
                </div>
            `;

    fillClientSelect();
  }

  function fillClientSelect() {
    const select = $("#sale-client");

    if (!select) {
      return;
    }

    const current = select.value;

    select.innerHTML =
      '<option value="">Selecione um cliente</option>' +
      data.clients
        .map(
          (client) =>
            `<option value="${esc(client.id)}">
                            ${esc(client.name)}
                        </option>`,
        )
        .join("");

    if (data.clients.some((client) => client.id === current)) {
      select.value = current;
    }
  }

  function fillSellerSelect(selectId, value = "") {
    const select = $(`#${selectId}`);

    if (!select) {
      return;
    }

    select.innerHTML =
      '<option value="">Selecione a vendedora</option>' +
      data.sellers
        .filter((seller) => seller.active !== false)
        .map(
          (seller) =>
            `<option value="${esc(seller.id)}">
                            ${esc(seller.name)}
                        </option>`,
        )
        .join("");

    if (
      data.sellers.some(
        (seller) => seller.id === value && seller.active !== false,
      )
    ) {
      select.value = value;
    }
  }

  function ensureSellerFields() {
    const saleForm = $("#sale-form");

    if (saleForm && !$("#sale-seller")) {
      const label = document.createElement("label");

      label.innerHTML = `
                Vendedora
                <select
                    id="sale-seller"
                    required
                ></select>
            `;

      saleForm.querySelector("label").before(label);
    }

    const clientForm = $("#client-form");

    if (clientForm && !$("#client-seller")) {
      const label = document.createElement("label");

      label.innerHTML = `
                Cadastrado por
                <select
                    id="client-seller"
                    name="sellerId"
                    required
                ></select>
            `;

      clientForm.elements.namedItem("id").after(label);
    }
  }

  // ============================================================
  // SABORES
  // ============================================================

  function flavorSelectEmoji(name) {
    const normalized = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (normalized.includes("maracuja")) {
      return "🟣";
    }

    if (
      normalized.includes("brigadeiro") ||
      normalized.includes("chocolate") ||
      normalized.includes("trufa")
    ) {
      return "🍫";
    }

    if (normalized.includes("beijinho") || normalized.includes("coco")) {
      return "🥥";
    }

    if (normalized.includes("morango") || normalized.includes("framboesa")) {
      return "🍓";
    }

    if (normalized.includes("limao")) {
      return "🍋";
    }

    if (normalized.includes("uva")) {
      return "🍇";
    }

    if (normalized.includes("ninho") || normalized.includes("leite")) {
      return "🥛";
    }

    if (
      normalized.includes("doce de leite") ||
      normalized.includes("caramelo")
    ) {
      return "🍯";
    }

    if (normalized.includes("pistache")) {
      return "💚";
    }

    if (normalized.includes("pacoca") || normalized.includes("amendoim")) {
      return "🥜";
    }

    return "🍬";
  }

  function flavorIcon(flavor) {
    const normalized = flavor.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (normalized.includes("maracuja")) {
      return `
                <svg
                    viewBox="0 0 40 40"
                    role="img"
                    aria-label="Maracujá cortado"
                >
                    <path
                        d="M18 8c-2-5 2-8 6-6 2 1 2 4 1 6 4-4 8-2 8 1-4 2-8 3-12 2"
                        fill="#75834b"
                    />

                    <circle
                        cx="20"
                        cy="23"
                        r="15"
                        fill="#633c65"
                    />

                    <circle
                        cx="20"
                        cy="23"
                        r="12"
                        fill="#f2c45e"
                    />

                    <path
                        d="M10 18c2-4 6-6 10-6v22c-7 0-12-5-12-11 0-2 1-4 2-5z"
                        fill="#f7d779"
                    />

                    <g fill="#34202c">
                        <ellipse cx="14" cy="17" rx="1.2" ry="2"/>
                        <ellipse cx="18" cy="15" rx="1.2" ry="2"/>
                        <ellipse cx="22" cy="17" rx="1.2" ry="2"/>
                        <ellipse cx="12" cy="22" rx="1.2" ry="2"/>
                        <ellipse cx="17" cy="21" rx="1.2" ry="2"/>
                        <ellipse cx="23" cy="23" rx="1.2" ry="2"/>
                        <ellipse cx="14" cy="28" rx="1.2" ry="2"/>
                        <ellipse cx="19" cy="27" rx="1.2" ry="2"/>
                        <ellipse cx="24" cy="29" rx="1.2" ry="2"/>
                    </g>
                </svg>
            `;
    }

    return `
            <span aria-hidden="true">
                ${flavorSelectEmoji(flavor.name)}
            </span>
        `;
  }

  function renderFlavors() {
    const list = $("#flavor-list");

    list.innerHTML = data.flavors.length
      ? data.flavors
          .map(
            (flavor) => `
                        <article class="flavor-card">

                            <div class="flavor-card-top">

                                <span class="flavor-icon">
                                    ${flavorIcon(flavor)}
                                </span>

                                <strong>
                                    ${esc(flavor.name)}
                                </strong>

                            </div>

                            <p>
                                ${esc(
                                  flavor.description ||
                                    "Uma delícia feita com carinho.",
                                )}
                            </p>

                            <div class="flavor-card-bottom">

                                <small>
                                    Disponível no cardápio
                                </small>

                                <span class="row-actions">

                                    <button
                                        class="mini-button"
                                        data-edit-flavor="${esc(flavor.id)}"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        class="mini-button"
                                        data-delete-flavor="${esc(flavor.id)}"
                                    >
                                        ×
                                    </button>

                                </span>

                            </div>

                        </article>
                    `,
          )
          .join("")
      : `
                <div class="empty-state">
                    Seu cardápio está vazio.
                    Adicione um sabor para começar.
                </div>
            `;

    fillFlavorSelects();
  }

  function fillFlavorSelects() {
    $$(".flavor-select").forEach((select) => {
      const previous = select.value;

      select.innerHTML =
        '<option value="">Selecione um sabor</option>' +
        data.flavors
          .map(
            (flavor) =>
              `<option value="${esc(flavor.id)}">
                                    ${flavorSelectEmoji(flavor.name)}
                                    ${esc(flavor.name)}
                                </option>`,
          )
          .join("");

      select.value = previous;
    });
  }

  // ============================================================
  // FORMULÁRIO DE VENDA
  // ============================================================

  function addSaleItem() {
    const host = $("#sale-items");

    const row = document.createElement("div");

    row.className = "sale-item";

    row.innerHTML = `
            <label>
                Sabor

                <select
                    class="flavor-select"
                    required
                >
                    <option value="">
                        Selecione um sabor
                    </option>
                </select>
            </label>

            <label>
                Quantidade

                <input
                    class="qty-input"
                    type="number"
                    min="1"
                    max="999"
                    value="1"
                    required
                >
            </label>

            <button
                type="button"
                class="remove-item"
                aria-label="Remover sabor"
            >
                ×
            </button>
        `;

    host.append(row);

    fillFlavorSelects();

    updateTotal();
  }

  function renderSaleForm() {
    ensureSellerFields();

    fillSellerSelect("sale-seller", $("#sale-seller")?.value || "");

    fillClientSelect();

    if (!$("#sale-items").children.length) {
      addSaleItem();
    }

    $("#promo-two").checked = data.promos.two;

    $("#promo-three").checked = data.promos.three;

    updateTotal();
  }

  function getSaleTotal() {
    let quantity = 0;

    $$(".qty-input").forEach((input) => {
      quantity += Math.max(0, Number(input.value) || 0);
    });

    return {
      qty: quantity,
      total: priceFor(quantity),
    };
  }

  function updateTotal() {
    const { qty, total } = getSaleTotal();

    $("#sale-total").textContent = money(total);

    let breakdown = "Selecione as trufas para calcular.";

    if (qty === 1) {
      breakdown = "1 × R$ 5,00";
    } else if (qty === 2) {
      breakdown = data.promos.two ? "Combo de 2: R$ 9,00" : "2 × R$ 5,00";
    } else if (qty >= 3) {
      breakdown = data.promos.three
        ? `${qty} × R$ 4,00`
        : data.promos.two
          ? `Combo de 2: R$ 9,00 + ${qty - 2} × R$ 5,00`
          : `${qty} × R$ 5,00`;
    }

    $("#price-explanation").textContent = breakdown;
  }

  // ============================================================
  // HISTÓRICO
  // ============================================================

  function renderHistory() {
    const query = ($("#history-search").value || "").toLowerCase();

    const from = $("#date-from").value;

    const to = $("#date-to").value;

    const sales = [...data.sales]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((sale) => {
        const text = `${sale.clientName} ${saleDetails(sale)} ${
          sale.sellerName || ""
        }`.toLowerCase();

        const day = sale.date.slice(0, 10);

        return (
          text.includes(query) && (!from || day >= from) && (!to || day <= to)
        );
      });

    $("#history-list").innerHTML = sales.length
      ? sales
          .map(
            (sale) => `
                            <div class="table-row">

                                <span class="recent-avatar">
                                    🍫
                                </span>

                                <div class="table-row-main">

                                    <strong>
                                        ${esc(sale.clientName)}
                                    </strong>

                                    <small>
                                        ${esc(saleDetails(sale))}

                                        ${
                                          sale.sellerName
                                            ? ` · Vendedora: ${esc(
                                                sale.sellerName,
                                              )}`
                                            : ""
                                        }

                                        ${
                                          sale.notes
                                            ? ` · ${esc(sale.notes)}`
                                            : ""
                                        }
                                    </small>

                                </div>

                                <span class="row-meta">
                                    ${dateLabel(sale.date)}
                                </span>

                                <span class="row-price">
                                    ${money(sale.total)}
                                </span>

                                <button
                                    type="button"
                                    class="mini-button sale-delete-button"
                                    data-delete-sale="${esc(sale.id)}"
                                >
                                    Excluir
                                </button>

                            </div>
                        `,
          )
          .join("")
      : `
                    <div class="empty-state">
                        Nenhuma venda encontrada com esses filtros.
                    </div>
                `;
  }

  // ============================================================
  // VENDEDORAS
  // ============================================================

  function renderSellers() {
    const select = $("#seller-select");

    const current = select.value;

    select.innerHTML = data.sellers
      .filter((seller) => seller.active !== false)
      .map(
        (seller) =>
          `<option value="${esc(seller.id)}">
                            ${esc(seller.name)}
                        </option>`,
      )
      .join("");

    if (
      data.sellers.some(
        (seller) => seller.id === current && seller.active !== false,
      )
    ) {
      select.value = current;
    } else {
      const firstActiveSeller = data.sellers.find(
        (seller) => seller.active !== false,
      );

      if (firstActiveSeller) {
        select.value = firstActiveSeller.id;
      }
    }

    $("#seller-date").value = todayKey();

    $("#seller-items").innerHTML = data.flavors.length
      ? data.flavors
          .map(
            (flavor) => `
                            <div
                                class="seller-item"
                                data-flavor-id="${esc(flavor.id)}"
                            >

                                <span class="seller-flavor-name">
                                    ${esc(flavor.name)}
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value="0"
                                    class="seller-taken"
                                    aria-label="${esc(flavor.name)} levadas"
                                >

                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value="0"
                                    class="seller-returned"
                                    aria-label="${esc(
                                      flavor.name,
                                    )} que voltaram"
                                >

                            </div>
                        `,
          )
          .join("")
      : `
                    <div class="empty-state">
                        Cadastre sabores antes de registrar o acerto.
                    </div>
                `;

    updateSellerNet();

    const totals = data.sellers.map((seller) => {
      const reports = data.sellerReports.filter(
        (report) => report.sellerId === seller.id,
      );

      return {
        seller,

        units: reports.reduce(
          (sum, report) =>
            sum +
            report.items.reduce(
              (total, item) => total + item.qty - item.returned,
              0,
            ),
          0,
        ),

        returned: reports.reduce(
          (sum, report) =>
            sum +
            report.items.reduce((total, item) => total + item.returned, 0),
          0,
        ),

        revenue: reports.reduce(
          (sum, report) => sum + (report.revenue || 0),
          0,
        ),

        count: reports.length,
      };
    });

    $("#seller-summary").innerHTML = totals
      .map(
        (total) => `
                        <article class="seller-summary-card">

                            <div class="seller-card-top">

                                <span class="seller-avatar">
                                    ${esc(
                                      total.seller.name
                                        .slice(0, 1)
                                        .toUpperCase(),
                                    )}
                                </span>

                                <div>
                                    <strong>
                                        ${esc(total.seller.name)}
                                    </strong>

                                    <small>
                                        ${total.count}
                                        ${
                                          total.count === 1
                                            ? "acerto registrado"
                                            : "acertos registrados"
                                        }
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    class="mini-button"
                                    data-rename-seller="${esc(total.seller.id)}"
                                >
                                    Renomear
                                </button>

                            </div>

                            <div class="seller-metrics">

                                <div>
                                    <strong>
                                        ${total.units}
                                    </strong>
                                    <small>
                                        vendidas
                                    </small>
                                </div>

                                <div>
                                    <strong>
                                        ${total.returned}
                                    </strong>
                                    <small>
                                        voltaram
                                    </small>
                                </div>

                                <div>
                                    <strong>
                                        ${money(total.revenue)}
                                    </strong>
                                    <small>
                                        faturamento
                                    </small>
                                </div>

                            </div>

                        </article>
                    `,
      )
      .join("");

    const recent = [...data.sellerReports]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    $("#seller-history").innerHTML = recent.length
      ? recent
          .map((report) => {
            const seller = data.sellers.find(
              (item) => item.id === report.sellerId,
            );

            const taken = report.items.reduce((sum, item) => sum + item.qty, 0);

            const returned = report.items.reduce(
              (sum, item) => sum + item.returned,
              0,
            );

            const sold = taken - returned;

            return `
                            <div class="table-row">

                                <span class="recent-avatar">
                                    ♧
                                </span>

                                <div class="table-row-main">

                                    <strong>
                                        ${esc(
                                          seller?.name || "Vendedora removida",
                                        )}
                                        ·
                                        ${dateLabel(report.date + "T12:00:00")}
                                    </strong>

                                    <small>
                                        ${report.items
                                          .map(
                                            (item) =>
                                              `${esc(item.flavorName)}: ${
                                                item.qty - item.returned
                                              } vendidas, ${
                                                item.returned
                                              } voltaram`,
                                          )
                                          .join(" · ")}
                                    </small>

                                </div>

                                <span class="row-meta">
                                    ${sold} vendidas
                                </span>

                                <button
                                    type="button"
                                    class="mini-button seller-delete-button"
                                    data-delete-seller-report="${esc(
                                      report.id,
                                    )}"
                                >
                                    Excluir
                                </button>

                            </div>
                        `;
          })
          .join("")
      : `
                    <div class="empty-state">
                        Os acertos salvos aparecerão aqui.
                    </div>
                `;

    const bySeller = data.sellers.map((seller) => ({
      seller,

      flavors: data.flavors.map((flavor) => {
        const matching = data.sellerReports
          .filter((report) => report.sellerId === seller.id)
          .flatMap((report) => report.items)
          .filter((item) => item.flavorId === flavor.id);

        return {
          name: flavor.name,

          sold: matching.reduce(
            (sum, item) => sum + item.qty - item.returned,
            0,
          ),

          returned: matching.reduce((sum, item) => sum + item.returned, 0),
        };
      }),
    }));

    $("#seller-flavor-breakdown").innerHTML = bySeller.length
      ? bySeller
          .map(
            (group) => `
                            <div class="seller-breakdown-group">

                                <h3>
                                    ${esc(group.seller.name)}
                                </h3>

                                ${
                                  group.flavors.length
                                    ? group.flavors
                                        .map(
                                          (flavor) => `
                                                    <div class="breakdown-row">

                                                        <span>
                                                            ${esc(flavor.name)}
                                                        </span>

                                                        <b>
                                                            ${flavor.sold}
                                                            vendidas
                                                        </b>

                                                        <small>
                                                            ${flavor.returned}
                                                            voltaram
                                                        </small>

                                                    </div>
                                                `,
                                        )
                                        .join("")
                                    : `
                                            <p class="empty-state">
                                                Cadastre sabores para ver o detalhamento.
                                            </p>
                                        `
                                }

                            </div>
                        `,
          )
          .join("")
      : `
                    <div class="empty-state">
                        Cadastre as vendedoras para ver os resultados.
                    </div>
                `;
  }

  function updateSellerNet() {
    const sold = $$(".seller-item").reduce(
      (total, row) =>
        total +
        Math.max(
          0,
          (Number($(".seller-taken", row).value) || 0) -
            (Number($(".seller-returned", row).value) || 0),
        ),
      0,
    );

    $("#seller-net-total").textContent = `${sold} ${
      sold === 1 ? "trufa" : "trufas"
    }`;
  }

  function renderSellerNames() {
    $("#seller-name-fields").innerHTML = data.sellers
      .map(
        (seller, index) => `
                        <label>
                            Vendedora ${index + 1}

                            <input
                                name="${esc(seller.id)}"
                                value="${esc(seller.name)}"
                                required
                                maxlength="50"
                            >
                        </label>
                    `,
      )
      .join("");
  }

  function renderSellerProfiles() {
    let host = $("#seller-profile-wrap");

    if (!host) {
      host = document.createElement("section");

      host.id = "seller-profile-wrap";

      host.className = "panel seller-profiles-panel";

      host.innerHTML = `
                <div class="panel-heading">
                    <div>
                        <h2>
                            Perfis e resultados
                        </h2>

                        <p>
                            Vendas e clientes atribuídos a cada vendedora.
                        </p>
                    </div>
                </div>

                <div
                    id="seller-profile-grid"
                    class="seller-profile-grid"
                ></div>
            `;

      $("#seller-summary").before(host);
    }

    let heading = $("#seller-stock-heading");

    if (!heading) {
      heading = document.createElement("div");

      heading.id = "seller-stock-heading";

      heading.className = "action-heading";

      heading.innerHTML = `
                <h2>
                    Acertos de estoque
                </h2>

                <p>
                    Unidades levadas e devolvidas registradas no fechamento do dia.
                </p>
            `;

      $("#seller-summary").before(heading);
    }

    $("#seller-profile-grid").innerHTML = data.sellers
      .map((seller) => {
        const sales = data.sales.filter((sale) => sale.sellerId === seller.id);

        const clients = data.clients.filter(
          (client) => client.sellerId === seller.id,
        );

        const units = sales.reduce(
          (sum, sale) =>
            sum +
            sale.items.reduce(
              (total, item) => total + Number(item.qty || 0),
              0,
            ),
          0,
        );

        const revenue = sales.reduce(
          (sum, sale) => sum + Number(sale.total || 0),
          0,
        );

        const returns = data.sellerReports
          .filter((report) => report.sellerId === seller.id)
          .reduce(
            (sum, report) =>
              sum +
              report.items.reduce(
                (total, item) => total + Number(item.returned || 0),
                0,
              ),
            0,
          );

        const byFlavor = data.flavors
          .map((flavor) => ({
            name: flavor.name,

            qty: sales.reduce(
              (sum, sale) =>
                sum +
                sale.items
                  .filter((item) => item.flavorId === flavor.id)
                  .reduce((total, item) => total + Number(item.qty || 0), 0),
              0,
            ),
          }))
          .filter((flavor) => flavor.qty > 0);

        return `
                            <article class="seller-profile-card">

                                <div class="seller-card-top">

                                    <span class="seller-avatar">
                                        ${esc(
                                          seller.name.slice(0, 1).toUpperCase(),
                                        )}
                                    </span>

                                    <div>

                                        <strong>
                                            ${esc(seller.name)}
                                        </strong>

                                        <small>
                                            Perfil de vendas
                                        </small>

                                    </div>

                                    <span class="row-actions">

                                        ${
                                          seller.active !== false
                                            ? `<button
                                                 type="button"
                                                 class="mini-button"
                                                 data-deactivate-seller="${esc(seller.id)}"
                                               >
                                                 Desativar
                                               </button>`
                                            : `<button
                                                 type="button"
                                                 class="mini-button"
                                                 data-activate-seller="${esc(seller.id)}"
                                               >
                                                 Reativar
                                               </button>`
                                        }

                                        <button
                                            type="button"
                                            class="mini-button"
                                            data-delete-seller="${esc(seller.id)}"
                                        >
                                            Excluir
                                        </button>

                                    </span>

                                </div>


                                <div class="seller-profile-metrics">

                                    <div>
                                        <strong>
                                            ${sales.length}
                                        </strong>
                                        <small>
                                            vendas
                                        </small>
                                    </div>

                                    <div>
                                        <strong>
                                            ${units}
                                        </strong>
                                        <small>
                                            trufas vendidas
                                        </small>
                                    </div>

                                    <div>
                                        <strong>
                                            ${money(revenue)}
                                        </strong>
                                        <small>
                                            faturamento
                                        </small>
                                    </div>

                                    <div>
                                        <strong>
                                            ${clients.length}
                                        </strong>
                                        <small>
                                            clientes cadastrados
                                        </small>
                                    </div>

                                    <div>
                                        <strong>
                                            ${returns}
                                        </strong>
                                        <small>
                                            trufas que voltaram
                                        </small>
                                    </div>

                                </div>


                                <div class="seller-profile-flavors">

                                    <b>
                                        Sabores vendidos
                                    </b>

                                    <p>
                                        ${
                                          byFlavor.length
                                            ? byFlavor
                                                .map(
                                                  (flavor) =>
                                                    `${esc(
                                                      flavor.name,
                                                    )} (${flavor.qty})`,
                                                )
                                                .join(" · ")
                                            : "Ainda não há vendas cadastradas."
                                        }
                                    </p>

                                </div>

                            </article>
                        `;
      })
      .join("");
  }

  // ============================================================
  // DATAS
  // ============================================================

  function setupDates() {
    const now = new Date();

    $("#today").textContent = now.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

    $("#date-long").textContent = now
      .toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
      })
      .toUpperCase();

    const weekday = [
      "DOMINGO",
      "SEGUNDA-FEIRA",
      "TERÇA-FEIRA",
      "QUINTA-FEIRA",
      "QUARTA-FEIRA",
      "SEXTA-FEIRA",
      "SÁBADO",
    ][now.getDay()];

    $(".welcome-row .eyebrow").firstChild.textContent = `${weekday}, `;
  }

  // ============================================================
  // EVENTOS
  // ============================================================

  document.addEventListener("click", async (event) => {
    const nav = event.target.closest("[data-view]");

    if (nav) {
      setView(nav.dataset.view);
    }

    const go = event.target.closest("[data-go]");

    if (go) {
      setView(go.dataset.go);
    }

    if (event.target.closest("#new-client-button")) {
      $("#client-dialog").showModal();
    }

    if (event.target.closest("#new-flavor-button")) {
      const form = $("#flavor-form");

      form.reset();

      form.elements.namedItem("id").value = "";

      $("#flavor-dialog-title").textContent = "Cadastrar sabor";

      $("#flavor-dialog").showModal();
    }

    const close = event.target.closest("[data-close]");

    if (close) {
      $(`#${close.dataset.close}`).close();
    }

    if (event.target.closest("#add-item")) {
      addSaleItem();
    }

    if (event.target.closest(".remove-item")) {
      event.target.closest(".sale-item").remove();

      if (!$("#sale-items").children.length) {
        addSaleItem();
      }

      updateTotal();
    }

    const editFlavor = event.target.closest("[data-edit-flavor]");

    if (editFlavor) {
      const flavor = data.flavors.find(
        (item) => item.id === editFlavor.dataset.editFlavor,
      );

      if (!flavor) {
        return;
      }

      const form = $("#flavor-form");

      form.elements.namedItem("id").value = flavor.id;

      form.elements.namedItem("name").value = flavor.name;

      form.elements.namedItem("description").value = flavor.description || "";

      $("#flavor-dialog-title").textContent = "Editar sabor";

      $("#flavor-dialog").showModal();
    }

    const deleteFlavor = event.target.closest("[data-delete-flavor]");

    if (deleteFlavor) {
      const id = deleteFlavor.dataset.deleteFlavor;

      try {
        await deleteFlavorFromDatabase(id);

        data.flavors = data.flavors.filter((flavor) => flavor.id !== id);

        renderFlavors();

        toast("Sabor removido do cardápio.");
      } catch (error) {
        console.error(error);

        toast("Não foi possível remover o sabor.");
      }
    }

    const deleteButton = event.target.closest("[data-delete-client]");

    if (deleteButton) {
      const id = deleteButton.dataset.deleteClient;

      try {
        await deleteClient(id);

        data.clients = data.clients.filter((client) => client.id !== id);

        renderClients();

        renderHome();

        renderSellerProfiles();

        toast("Cliente removido.");
      } catch (error) {
        console.error(error);

        toast("Não foi possível remover o cliente.");
      }
    }
  });

  async function deleteFlavorFromDatabase(flavorId) {
    await deleteFlavor(flavorId);
  }

  // ============================================================
  // INPUT
  // ============================================================

  document.addEventListener("input", (event) => {
    if (event.target.matches(".qty-input")) {
      updateTotal();
    }

    if (event.target.id === "client-search") {
      renderClients();
    }

    if (
      event.target.id === "history-search" ||
      event.target.id === "date-from" ||
      event.target.id === "date-to"
    ) {
      renderHistory();
    }

    if (event.target.matches(".seller-taken,.seller-returned")) {
      updateSellerNet();
    }
  });

  // ============================================================
  // CHANGE
  // ============================================================

  document.addEventListener("change", async (event) => {
    if (event.target.matches(".flavor-select")) {
      updateTotal();
    }

    if (event.target.matches("#promo-two,#promo-three")) {
      data.promos = {
        one: false,
        two: $("#promo-two").checked,
        three: $("#promo-three").checked,
      };

      try {
        await savePromos();

        updateTotal();

        toast("Promoções atualizadas.");
      } catch (error) {
        console.error(error);

        toast("Não foi possível salvar as promoções.");
      }
    }
  });

  // ============================================================
  // NOVO CLIENTE
  // ============================================================

  $("#new-client-button").addEventListener("click", () => {
    const form = $("#client-form");

    ensureSellerFields();

    form.reset();

    form.elements.namedItem("id").value = "";

    fillSellerSelect("client-seller");

    $("#client-dialog-title").textContent = "Cadastrar cliente";
  });

  // ============================================================
  // SALVAR CLIENTE
  // ============================================================

  $("#client-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);

    const id = String(formData.get("id") || "");

    const client = {
      id,

      name: String(formData.get("name")).trim(),

      phone: String(formData.get("phone") || "").trim(),

      email: String(formData.get("email") || "").trim(),

      sellerId: String(formData.get("sellerId") || ""),
    };

    try {
      if (id) {
        await updateClient(client);

        data.clients = data.clients.map((old) =>
          old.id === id ? client : old,
        );
      } else {
        await insertClient(client);

        data.clients.push(client);
      }

      form.closest("dialog").close();

      form.reset();

      renderClients();

      renderHome();

      renderSellerProfiles();

      toast(
        id
          ? "Cliente atualizado com sucesso!"
          : "Cliente cadastrado com sucesso! ♡",
      );
    } catch (error) {
      console.error(error);

      toast("Não foi possível salvar o cliente.");
    }
  });

  // ============================================================
  // SALVAR SABOR
  // ============================================================

  $("#flavor-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const id = form.elements.namedItem("id").value;

    const flavor = {
      id,

      name: form.elements.namedItem("name").value.trim(),

      description: form.elements.namedItem("description").value.trim(),
    };

    try {
      if (id) {
        await updateFlavor(flavor);

        data.flavors = data.flavors.map((old) =>
          old.id === id ? flavor : old,
        );
      } else {
        await insertFlavor(flavor);

        data.flavors.push(flavor);
      }

      form.closest("dialog").close();

      form.reset();

      renderFlavors();

      toast(id ? "Sabor atualizado!" : "Sabor cadastrado com sucesso!");
    } catch (error) {
      console.error(error);

      toast("Não foi possível salvar o sabor.");
    }
  });

  // ============================================================
  // SALVAR VENDA
  // ============================================================

  $("#sale-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const client = data.clients.find(
      (item) => item.id === $("#sale-client").value,
    );

    const items = $$(".sale-item")
      .map((row) => {
        const flavor = data.flavors.find(
          (item) => item.id === $(".flavor-select", row).value,
        );

        return flavor
          ? {
              flavorId: flavor.id,

              flavorName: flavor.name,

              qty: Number($(".qty-input", row).value),
            }
          : null;
      })
      .filter(Boolean);

    if (!client) {
      toast("Cadastre ou selecione um cliente primeiro.");

      return;
    }

    if (!items.length || items.reduce((sum, item) => sum + item.qty, 0) < 1) {
      toast("Adicione ao menos uma trufa ao pedido.");

      return;
    }

    const seller = data.sellers.find(
      (item) => item.id === $("#sale-seller").value,
    );

    const quantity = items.reduce((sum, item) => sum + item.qty, 0);

    const sale = {
      id: "",

      clientId: client.id,

      clientName: client.name,

      sellerId: seller?.id || "",

      sellerName: seller?.name || "",

      items,

      total: priceFor(quantity),

      notes: $("#sale-notes").value.trim(),

      date: new Date().toISOString(),
    };

    try {
      await insertSale(sale);

      data.sales.push(sale);

      form.reset();

      $("#sale-items").innerHTML = "";

      addSaleItem();

      renderHome();

      renderSellerProfiles();

      toast("Venda cadastrada com sucesso! 🍫");

      setView("inicio");
    } catch (error) {
      console.error(error);

      toast("Não foi possível cadastrar a venda.");
    }
  });

  // ============================================================
  // FILTROS
  // ============================================================

  $("#clear-filters").addEventListener("click", () => {
    $("#history-search").value = "";

    $("#date-from").value = "";

    $("#date-to").value = "";

    renderHistory();
  });

  // ============================================================
  // RENOMEAR VENDEDORA
  // ============================================================

  // ============================================================
// CADASTRAR / DESATIVAR / REATIVAR VENDEDORA
// ============================================================

function askSellerName() {
  return new Promise((resolve) => {
    if (!$("#seller-dialog-style")) {
      const style = document.createElement("style");

      style.id = "seller-dialog-style";

      style.textContent = `
        #seller-name-dialog {
          width: min(380px, calc(100% - 32px));
          border: 0;
          border-radius: 20px;
          padding: 28px;
          background: #ffffff;
          color: #38251f;
          box-shadow: 0 20px 60px rgba(56, 37, 31, .18);
        }

        #seller-name-dialog::backdrop {
          background: rgba(56, 37, 31, .35);
        }

        #seller-name-dialog h2 {
          margin: 0 0 16px;
          font-size: 20px;
        }

        #seller-name-dialog label {
          display: block;
          font-weight: 600;
        }

        #seller-name-dialog input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin-top: 7px;
          padding: 13px 14px;
          border: 1px solid #eadbd4;
          border-radius: 12px;
          outline: none;
          font: inherit;
        }

        #seller-name-dialog input:focus {
          border-color: #d89a7c;
        }

        .seller-dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .seller-dialog-actions button {
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
        }

        .seller-dialog-cancel {
          background: #f4ebe6;
          color: #38251f;
        }

        .seller-dialog-confirm {
          background: #38251f;
          color: #ffffff;
        }
      `;

      document.head.appendChild(style);
    }

    const dialog = document.createElement("dialog");

    dialog.id = "seller-name-dialog";

    dialog.innerHTML = `
      <form>
        <h2>Nova vendedora</h2>

        <label>
          Nome
          <input
            name="name"
            maxlength="50"
            required
            autocomplete="off"
            placeholder="Ex.: Maria"
          >
        </label>

        <div class="seller-dialog-actions">
          <button type="button" class="seller-dialog-cancel">
            Cancelar
          </button>

          <button type="submit" class="seller-dialog-confirm">
            Salvar
          </button>
        </div>
      </form>
    `;

    document.body.appendChild(dialog);

    const form = $("form", dialog);

    let result = null;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = form.elements.namedItem("name").value.trim();

      if (!name) {
        return;
      }

      result = name;

      dialog.close();
    });

    $(".seller-dialog-cancel", dialog).addEventListener("click", () => {
      dialog.close();
    });

    dialog.addEventListener("close", () => {
      dialog.remove();

      resolve(result);
    });

    dialog.showModal();

    form.elements.namedItem("name").focus();
  });
}

function refreshSellerViews() {
  renderSellerNames();
  renderSellers();
  renderSellerProfiles();

  fillSellerSelect("sale-seller", $("#sale-seller")?.value || "");
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  // Cadastrar
  if (
    button.id === "new-seller-button" ||
    button.hasAttribute("data-new-seller") ||
    /cadastrar vendedora/i.test(button.textContent)
  ) {
    const name = await askSellerName();

    if (!name) {
      return;
    }

    try {
      const seller = await insertSeller({ id: "", name: name.trim() });

      data.sellers.push(seller);

      refreshSellerViews();

      toast("Vendedora cadastrada com sucesso!");
    } catch (error) {
      console.error(error);

      toast("Não foi possível cadastrar a vendedora.");
    }

    return;
  }

  // Desativar
  const deactivate = button.closest("[data-deactivate-seller]");

  if (deactivate) {
    const seller = data.sellers.find(
      (item) => item.id === deactivate.dataset.deactivateSeller,
    );

    if (!seller) {
      return;
    }

    try {
      await deactivateSeller(seller.id);

      seller.active = false;

      refreshSellerViews();

      toast("Vendedora desativada. O histórico foi preservado.");
    } catch (error) {
      console.error(error);

      toast("Não foi possível desativar a vendedora.");
    }

    return;
  }

  // Reativar
  const activate = button.closest("[data-activate-seller]");

  if (activate) {
    const seller = data.sellers.find(
      (item) => item.id === activate.dataset.activateSeller,
    );

    if (!seller) {
      return;
    }

    try {
      await activateSeller(seller.id);

      seller.active = true;

      refreshSellerViews();

      toast("Vendedora reativada.");
    } catch (error) {
      console.error(error);

      toast("Não foi possível reativar a vendedora.");
    }

    return;
  }

  // Excluir (definitivo)
  const remove = button.closest("[data-delete-seller]");

  if (remove) {
    const seller = data.sellers.find(
      (item) => item.id === remove.dataset.deleteSeller,
    );

    if (!seller) {
      return;
    }

    if (
      !window.confirm(
        `Excluir "${seller.name}" definitivamente? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      await deleteSeller(seller.id);

      data.sellers = data.sellers.filter((item) => item.id !== seller.id);

      data.clients.forEach((client) => {
        if (client.sellerId === seller.id) {
          client.sellerId = "";
        }
      });

      refreshSellerViews();

      toast("Vendedora excluída.");
    } catch (error) {
      console.error(error);

      toast(
        error?.code === "23503"
          ? "Esta vendedora tem vendas, clientes ou acertos vinculados. Use Desativar."
          : "Não foi possível excluir a vendedora.",
      );
    }
  }
});

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-rename-seller]");

    if (!button) {
      return;
    }

    const seller = data.sellers.find(
      (item) => item.id === button.dataset.renameSeller,
    );

    if (!seller) {
      return;
    }

    const name = window.prompt("Nome da vendedora:", seller.name);

    if (!name?.trim()) {
      return;
    }

    try {
      seller.name = name.trim();

      await updateSeller(seller);

      renderSellers();

      renderSellerProfiles();

      toast("Nome da vendedora atualizado.");
    } catch (error) {
      console.error(error);

      toast("Não foi possível atualizar a vendedora.");
    }
  });

  // ============================================================
  // EDITAR CLIENTE
  // ============================================================

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-client]");

    if (!button) {
      return;
    }

    const client = data.clients.find(
      (item) => item.id === button.dataset.editClient,
    );

    if (!client) {
      return;
    }

    const form = $("#client-form");

    ensureSellerFields();

    fillSellerSelect("client-seller", client.sellerId || "");

    form.elements.namedItem("id").value = client.id;

    form.elements.namedItem("name").value = client.name;

    form.elements.namedItem("phone").value = client.phone || "";

    form.elements.namedItem("email").value = client.email || "";

    $("#client-dialog-title").textContent = "Editar cliente";

    $("#client-dialog").showModal();
  });

  // ============================================================
  // EXCLUIR ACERTO
  // ============================================================

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-seller-report]");

    if (!button) {
      return;
    }

    const report = data.sellerReports.find(
      (item) => item.id === button.dataset.deleteSellerReport,
    );

    if (!report) {
      return;
    }

    if (
      !window.confirm(
        "Excluir este acerto? Os totais da vendedora serão atualizados.",
      )
    ) {
      return;
    }

    try {
      await deleteSellerReport(report.id);

      data.sellerReports = data.sellerReports.filter(
        (item) => item.id !== report.id,
      );

      renderSellers();

      renderSellerProfiles();

      toast("Acerto excluído; os totais foram atualizados.");
    } catch (error) {
      console.error(error);

      toast("Não foi possível excluir o acerto.");
    }
  });

  // ============================================================
  // EXCLUIR VENDA
  // ============================================================

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-sale]");

    if (!button) {
      return;
    }

    const sale = data.sales.find(
      (item) => item.id === button.dataset.deleteSale,
    );

    if (!sale) {
      return;
    }

    if (
      !window.confirm(
        `Excluir a venda de ${sale.clientName}? O painel e o histórico serão atualizados.`,
      )
    ) {
      return;
    }

    try {
      await deleteSale(sale.id);

      data.sales = data.sales.filter((item) => item.id !== sale.id);

      renderHome();

      renderHistory();

      renderSellerProfiles();

      toast("Venda excluída; o painel foi atualizado.");
    } catch (error) {
      console.error(error);

      toast("Não foi possível excluir a venda.");
    }
  });

  // ============================================================
  // MENU MOBILE
  // ============================================================

  const mobileMenuButton = $("#mobile-menu-button");

  const mobileBackdrop = $("#mobile-nav-backdrop");

  const mobileBackButton = $("#mobile-back-button");

  function closeMobileNav() {
    const open = $(".sidebar").classList.contains("mobile-open");

    $(".sidebar").classList.remove("mobile-open");

    mobileBackdrop.classList.remove("show");

    mobileMenuButton.setAttribute("aria-expanded", "false");

    mobileMenuButton.setAttribute("aria-label", "Abrir menu");

    mobileMenuButton.textContent = "☰";

    if (open) {
      document.body.classList.remove("mobile-nav-open");
    }
  }

  mobileMenuButton.addEventListener("click", () => {
    const open = $(".sidebar").classList.toggle("mobile-open");

    mobileBackdrop.classList.toggle("show", open);

    mobileMenuButton.setAttribute("aria-expanded", String(open));

    mobileMenuButton.setAttribute(
      "aria-label",
      open ? "Fechar menu" : "Abrir menu",
    );

    mobileMenuButton.textContent = open ? "×" : "☰";

    document.body.classList.toggle("mobile-nav-open", open);
  });

  mobileBackButton.addEventListener("click", () => {
    setView("inicio");

    mobileBackButton.classList.add("is-hidden");
  });

  mobileBackdrop.addEventListener("click", closeMobileNav);

  document.addEventListener("click", (event) => {
    if (event.target.closest(".sidebar .nav-item")) {
      closeMobileNav();
    }

    const target = event.target.closest("[data-view],[data-go]");

    if (target) {
      mobileBackButton.classList.toggle(
        "is-hidden",
        (target.dataset.view || target.dataset.go) === "inicio",
      );
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
    }
  });

  // ============================================================
  // ACERTO DA VENDEDORA
  // ============================================================

  $("#seller-report-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const sellerId = $("#seller-select").value;

    const date = $("#seller-date").value;

    const rows = $$(".seller-item");

    if (!sellerId) {
      toast("Selecione uma vendedora.");

      return;
    }

    if (!date) {
      toast("Informe a data do acerto.");

      return;
    }

    const items = rows
      .map((row) => {
        const qty = Math.max(
          0,
          parseInt($(".seller-taken", row).value, 10) || 0,
        );

        const returned = Math.max(
          0,
          parseInt($(".seller-returned", row).value, 10) || 0,
        );

        const flavor = data.flavors.find(
          (item) => item.id === row.dataset.flavorId,
        );

        return flavor
          ? {
              flavorId: flavor.id,

              flavorName: flavor.name,

              qty,

              returned,
            }
          : null;
      })
      .filter(Boolean);

    if (items.some((item) => item.returned > item.qty)) {
      toast("A quantidade que voltou não pode ser maior que a levada.");

      return;
    }

    if (!items.some((item) => item.qty > 0)) {
      toast("Informe ao menos uma quantidade levada.");

      return;
    }

    const sold = items.reduce((sum, item) => sum + item.qty - item.returned, 0);

    const report = {
      id: "",

      sellerId,

      date,

      items,

      revenue: priceFor(sold),

      createdAt: new Date().toISOString(),
    };

    try {
      await insertSellerReport(report);

      data.sellerReports.push(report);

      renderSellers();

      renderSellerProfiles();

      toast("Acerto da vendedora salvo!");
    } catch (error) {
      console.error(error);

      toast("Não foi possível salvar o acerto.");
    }
  });

  // ============================================================
  // NOMES DAS VENDEDORAS
  // ============================================================

  $("#seller-names-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    const formData = new FormData(form);

    try {
      for (const seller of data.sellers) {
        const newName = String(formData.get(seller.id) || seller.name).trim();

        if (!newName) {
          continue;
        }

        if (newName !== seller.name) {
          seller.name = newName;

          await updateSeller(seller);
        }
      }

      renderSellerNames();

      renderSellers();

      renderSellerProfiles();

      toast("Nomes das vendedoras salvos.");
    } catch (error) {
      console.error(error);

      toast("Não foi possível salvar os nomes.");
    }
  });

  // ============================================================
  // INICIALIZAÇÃO DA APLICAÇÃO
  // ============================================================

  function initializeApplication() {
    setupDates();

    loadStoreLogo();

    updatePromoCopy();

    renderHome();

    renderClients();

    renderFlavors();

    renderSaleForm();

    renderSellerNames();

    renderSellers();

    renderSellerProfiles();
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  async function initialize() {
    try {
      const authenticated = await checkAuthentication();

      if (!authenticated) {
        createLoginScreen();

        return;
      }

      await loadDatabase();

      initializeApplication();
    } catch (error) {
      console.error("Erro ao iniciar o sistema:", error);
    }
  }

  initialize();
})();