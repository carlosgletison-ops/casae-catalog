import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Plus, 
  Trash2, 
  Settings, 
  Tag, 
  RefreshCw, 
  Download, 
  Upload, 
  Edit2, 
  FileText, 
  Image as ImageIcon,
  Check,
  X,
  FileDown
} from 'lucide-react';
import initialProducts from './data/products.json';

function App() {
  // Lista de categorias oficiais solicitadas pelo usuário
  const categoriesList = ["Tecidos", "Porcelanas", "Decoração", "Essências", "Linha Corpo"];

  // Estado principal carregando do localStorage ou arquivo JSON inicial com migração
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('casae_catalog_products_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao ler produtos do localStorage", e);
      }
    }
    return initialProducts.map(p => ({ ...p, isActive: true }));
  });

  // Salvar no localStorage sempre que os produtos mudarem
  useEffect(() => {
    localStorage.setItem('casae_catalog_products_v3', JSON.stringify(products));
  }, [products]);

  // Configurações do Catálogo
  const [companyName, setCompanyName] = useState('Casaê');
  const [companyTagline, setCompanyTagline] = useState('Decoração e Tecidos');
  const [catalogSubtitle, setCatalogSubtitle] = useState('Curadoria & Catálogo de Preços');
  const [catalogYear, setCatalogYear] = useState('Coleção Outono / Inverno 2026');
  
  // Informações de Contato (Contra-capa)
  const [phone, setPhone] = useState('(32) 99881-2233');
  const [instagram, setInstagram] = useState('@casae_loja');
  const [email, setEmail] = useState('contato@casae.com.br');
  const [address, setAddress] = useState('Rua Direita, 45 — Centro Histórico, Tiradentes - MG');
  const [website, setWebsite] = useState('casae-contato.vercel.app');

  // Configurações de Diagramação
  const [gridCols, setGridCols] = useState(2); // 2 ou 3 colunas
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [includeCover, setIncludeCover] = useState(true);
  const [includeBackCover, setIncludeBackCover] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Imagem de Capa (usa por padrão o ID do primeiro produto ou customizável)
  const [coverImageId, setCoverImageId] = useState(products[0]?.imageId || '12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8');

  // Estado da Interface
  const [activeTab, setActiveTab] = useState('products'); // 'products' ou 'settings'
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Lista de imagens disponíveis dos 50 itens do Drive para atribuição
  const driveImages = products.map(p => ({
    filename: p.imageName,
    id: p.imageId
  })).filter((value, index, self) => 
    self.findIndex(t => t.id === value.id) === index
  );

  // Restaurar dados originais
  const handleResetData = () => {
    if (window.confirm("Deseja mesmo redefinir o catálogo para as 50 fotos originais do Drive com as novas categorias? Suas alterações serão perdidas.")) {
      setProducts(initialProducts.map(p => ({ ...p, isActive: true })));
      setSelectedProduct(null);
      setCoverImageId(initialProducts[0].imageId);
    }
  };

  // Exportar banco de dados atual como JSON
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `catalogo_casae_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Importar banco de dados JSON
  const handleImportData = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          setProducts(parsed);
          setSelectedProduct(null);
          alert("Catálogo importado com sucesso!");
        } else {
          alert("Formato inválido. O arquivo deve ser um JSON contendo uma lista de produtos.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo JSON.");
      }
    };
  };

  // Adicionar Novo Produto
  const handleAddProduct = () => {
    const newId = `prod_${Date.now()}`;
    const newProd = {
      id: newId,
      name: "Novo Item de Decoração",
      category: selectedCategoryFilter === 'Todos' ? 'Decoração' : selectedCategoryFilter,
      price: 0.00,
      description: "Escreva uma breve descrição deste produto elegante para casa.",
      imageName: driveImages[0]?.filename || "DSC00001.JPG",
      imageId: driveImages[0]?.id || "12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8",
      imageUrl: `https://drive.google.com/thumbnail?id=${driveImages[0]?.id || "12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8"}&sz=w800`,
      isActive: true
    };
    setProducts([newProd, ...products]);
    handleSelectProductForEditing(newProd);
  };

  // Selecionar Produto para Edição com Efeito de Foco
  const handleSelectProductForEditing = (prod) => {
    setSelectedProduct(prod);
    setActiveTab('products');
    setTimeout(() => {
      const editAnchor = document.getElementById('edit-form-anchor');
      if (editAnchor) {
        editAnchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  };

  // Atualizar Produto Editado
  const handleUpdateProduct = (updatedField, value) => {
    if (!selectedProduct) return;
    
    const updated = { ...selectedProduct, [updatedField]: value };
    
    // Se mudou a imagem do Drive, atualizar a URL
    if (updatedField === 'imageId') {
      const selectedImg = driveImages.find(img => img.id === value);
      if (selectedImg) {
        updated.imageName = selectedImg.filename;
        updated.imageUrl = `https://drive.google.com/thumbnail?id=${value}&sz=w800`;
      }
    }

    setSelectedProduct(updated);
    setProducts(products.map(p => p.id === selectedProduct.id ? updated : p));
  };

  // Excluir Produto
  const handleDeleteProduct = (id) => {
    if (window.confirm("Excluir este produto definitivamente?")) {
      setProducts(products.filter(p => p.id !== id));
      setSelectedProduct(null);
    }
  };

  // Filtrar produtos ativos e que combinam com a busca/categoria na tela de edição
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategoryFilter === 'Todos' || p.category === selectedCategoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return p.isActive && matchesCategory && matchesSearch;
  });

  // Função auxiliar para chunking de produtos
  const chunkProducts = (list, size) => {
    const chunks = [];
    for (let i = 0; i < list.length; i += size) {
      chunks.push(list.slice(i, i + size));
    }
    return chunks;
  };

  // Paginação física inteligente A4 AGRUPADA POR CATEGORIA
  // Isso garante que uma página NUNCA misture categorias diferentes e crie quebras limpas.
  const itemsPerPage = gridCols === 2 ? 6 : 9;
  const pagesOfProducts = [];

  categoriesList.forEach(cat => {
    // Filtrar produtos ativos que combinam com filtros para esta categoria específica
    const catProducts = filteredProducts.filter(p => p.category === cat);
    if (catProducts.length > 0) {
      // Chunkar os produtos desta categoria
      const catChunks = chunkProducts(catProducts, itemsPerPage);
      catChunks.forEach((chunk, chunkIdx) => {
        pagesOfProducts.push({
          category: cat,
          items: chunk,
          pageIdxInCategory: chunkIdx,
          totalCategoryPages: catChunks.length
        });
      });
    }
  });

  const totalContentPages = pagesOfProducts.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="app-container">
      {/* SIDEBAR EDITOR */}
      <aside className="editor-sidebar" id="sidebar-editor">
        <div className="sidebar-header">
          <h2>{companyName}</h2>
          <p>Editor de Catálogo de Preços</p>
        </div>

        {/* Tabs do Editor */}
        <div className="editor-tabs">
          <button 
            className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Tag size={16} style={{ marginBottom: '-3px', marginRight: '4px' }} />
            Produtos ({products.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} style={{ marginBottom: '-3px', marginRight: '4px' }} />
            Layout & Capa
          </button>
        </div>

        <div className="sidebar-content">
          {/* TAB 1: PRODUTOS */}
          {activeTab === 'products' && (
            <div className="editor-section">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={handleAddProduct} style={{ flex: 1 }}>
                  <Plus size={16} /> Adicionar Item
                </button>
                <button className="btn-secondary" onClick={handleResetData} title="Restaurar originais">
                  <RefreshCw size={15} />
                </button>
              </div>

              {/* Busca e Filtro de Categoria no Editor */}
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Pesquisar item..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="form-group">
                <select 
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                >
                  <option value="Todos">Todas as Categorias</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Lista dos Produtos para Selecionar e Editar */}
              <div className="products-edit-list">
                {products
                  .filter(p => {
                    const matchesCategory = selectedCategoryFilter === 'Todos' || p.category === selectedCategoryFilter;
                    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  })
                  .map(p => (
                    <div 
                      key={p.id} 
                      className={`product-edit-item ${selectedProduct?.id === p.id ? 'selected' : ''} ${!p.isActive ? 'inactive' : ''}`}
                      onClick={() => handleSelectProductForEditing(p)}
                    >
                      <img 
                        src={p.imageUrl.startsWith('http') ? p.imageUrl : `https://drive.google.com/thumbnail?id=${p.imageId}&sz=100`} 
                        alt={p.name} 
                        className="product-edit-thumb"
                        onError={(e) => {
                          e.target.src = "https://www.gstatic.com/images/icons/material/system/1x/broken_image_grey600_18dp.png";
                        }}
                      />
                      <div className="product-edit-info">
                        <div className="product-edit-name">{p.name}</div>
                        <div className="product-edit-price">R$ {p.price.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span 
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: p.isActive ? '#52c41a' : '#d9d9d9',
                            display: 'inline-block'
                          }}
                          title={p.isActive ? 'Ativo no catálogo' : 'Inativo'}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Formulário de Edição do Produto Selecionado */}
              {selectedProduct && (
                <div 
                  id="edit-form-anchor"
                  className="editor-section" 
                  style={{ 
                    border: '1.5px solid var(--accent)', 
                    borderRadius: '8px', 
                    padding: '16px',
                    backgroundColor: '#fafafa',
                    marginTop: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 'bold' }}>
                      Editar Produto Selecionado
                    </h4>
                    <button className="btn-icon-only" onClick={() => handleDeleteProduct(selectedProduct.id)} title="Excluir produto">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Nome do Produto</label>
                    <input 
                      type="text" 
                      value={selectedProduct.name}
                      onChange={(e) => handleUpdateProduct('name', e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Preço (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={selectedProduct.price}
                        onChange={(e) => handleUpdateProduct('price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoria</label>
                      <select 
                        value={selectedProduct.category}
                        onChange={(e) => handleUpdateProduct('category', e.target.value)}
                      >
                        {categoriesList.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descrição Curta</label>
                    <textarea 
                      rows="3"
                      value={selectedProduct.description}
                      onChange={(e) => handleUpdateProduct('description', e.target.value)}
                      style={{ resize: 'none' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Selecionar Foto (Fotos do Drive)</label>
                    <select
                      value={selectedProduct.imageId}
                      onChange={(e) => handleUpdateProduct('imageId', e.target.value)}
                    >
                      {driveImages.map((img, idx) => (
                        <option key={img.id} value={img.id}>
                          Imagem {idx + 1} ({img.filename})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ou URL de Imagem Personalizada</label>
                    <input 
                      type="text" 
                      value={selectedProduct.imageUrl.includes('drive.google.com/thumbnail?id=') ? '' : selectedProduct.imageUrl}
                      onChange={(e) => handleUpdateProduct('imageUrl', e.target.value || `https://drive.google.com/thumbnail?id=${selectedProduct.imageId}&sz=w800`)}
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Insira um link direto para usar uma foto externa (Unsplash, etc.). Apague para voltar a usar a foto selecionada acima.
                    </p>
                  </div>

                  <div className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      id="edit-active"
                      checked={selectedProduct.isActive}
                      onChange={(e) => handleUpdateProduct('isActive', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="edit-active" style={{ cursor: 'pointer', fontSize: '13px', textTransform: 'none' }}>
                      Exibir no catálogo impresso
                    </label>
                  </div>
                </div>
              )}

              {/* Botões de Carga/Descarga JSON */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Backup de Dados
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" onClick={handleExportData} style={{ flex: 1, fontSize: '12px', padding: '8px' }}>
                    <Download size={14} /> Exportar JSON
                  </button>
                  <label className="btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '8px', textAlign: 'center', cursor: 'pointer' }}>
                    <Upload size={14} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} /> Importar
                    <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURAÇÕES DE LAYOUT */}
          {activeTab === 'settings' && (
            <div className="editor-section">
              <div className="section-title">Dados da Marca</div>
              
              <div className="form-group">
                <label>Nome da Loja</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Slogan / Subtítulo</label>
                <input 
                  type="text" 
                  value={companyTagline}
                  onChange={(e) => setCompanyTagline(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Título da Capa</label>
                <input 
                  type="text" 
                  value={catalogSubtitle}
                  onChange={(e) => setCatalogSubtitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Coleção / Rodapé</label>
                <input 
                  type="text" 
                  value={catalogYear}
                  onChange={(e) => setCatalogYear(e.target.value)}
                />
              </div>

              <div className="section-title" style={{ marginTop: '16px' }}>Capa & Contra-capa</div>

              <div className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id="inc-cover"
                  checked={includeCover}
                  onChange={(e) => setIncludeCover(e.target.checked)}
                />
                <label htmlFor="inc-cover">Incluir Capa Inicial</label>
              </div>

              {includeCover && (
                <div className="form-group" style={{ paddingLeft: '20px', borderLeft: '2px solid var(--border)' }}>
                  <label>Foto de Destaque da Capa</label>
                  <select
                    value={coverImageId}
                    onChange={(e) => setCoverImageId(e.target.value)}
                  >
                    {driveImages.map((img, idx) => (
                      <option key={img.id} value={img.id}>
                        Imagem {idx + 1} ({img.filename})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id="inc-back"
                  checked={includeBackCover}
                  onChange={(e) => setIncludeBackCover(e.target.checked)}
                />
                <label htmlFor="inc-back">Incluir Contra-capa (Contatos)</label>
              </div>

              <div className="section-title" style={{ marginTop: '16px' }}>Contatos (Contra-capa)</div>

              <div className="form-group">
                <label>Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Instagram</label>
                <input 
                  type="text" 
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Site</label>
                <input 
                  type="text" 
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Endereço Físico</label>
                <textarea 
                  rows="2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="section-title" style={{ marginTop: '16px' }}>Formatador de Catálogo</div>
              
              <div className="form-group">
                <label>Colunas de Produtos por Página</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', gap: '4px', alignItems: 'center', textTransform: 'none', fontWeight: '500', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="columns" 
                      value="2"
                      checked={gridCols === 2}
                      onChange={() => setGridCols(2)}
                    />
                    2 Colunas (6 itens / pág)
                  </label>
                  <label style={{ display: 'flex', gap: '4px', alignItems: 'center', textTransform: 'none', fontWeight: '500', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="columns" 
                      value="3"
                      checked={gridCols === 3}
                      onChange={() => setGridCols(3)}
                    />
                    3 Colunas (9 itens / pág)
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id="show-desc"
                  checked={showDescriptions}
                  onChange={(e) => setShowDescriptions(e.target.checked)}
                />
                <label htmlFor="show-desc">Exibir Descrições</label>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id="show-code"
                  checked={showCode}
                  onChange={(e) => setShowCode(e.target.checked)}
                />
                <label htmlFor="show-code">Exibir Código de Referência</label>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA DE VISUALIZAÇÃO DO CATÁLOGO EM TEMPO REAL */}
      <main className="preview-area">
        {/* Barra superior de controle do preview */}
        <div className="preview-controls">
          <div className="preview-title-bar">
            <h1>Visualização das Páginas A4</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Filtro ativo: <strong>{selectedCategoryFilter}</strong> ({filteredProducts.length} itens no total)
            </p>
          </div>
          <div className="preview-actions">
            <button className="btn-primary" onClick={handlePrint} style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '8px' }}>
              <Printer size={18} /> Exportar / Imprimir PDF
            </button>
          </div>
        </div>

        {/* Alerta de instruções ocultado ao imprimir */}
        <div 
          className="instructions-alert" 
          style={{ 
            backgroundColor: 'var(--accent-light)', 
            border: '1px solid var(--border)',
            padding: '16px',
            borderRadius: '8px',
            width: '210mm',
            marginBottom: '24px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--text-main)'
          }}
          id="sidebar-editor"
        >
          <strong>💡 Dica para salvar como PDF perfeito:</strong>
          <ol style={{ marginLeft: '20px', marginTop: '6px' }}>
            <li>Clique no botão <strong>Exportar / Imprimir PDF</strong> acima.</li>
            <li>No diálogo do navegador, mude o Destino para <strong>Salvar como PDF</strong>.</li>
            <li>Abra <strong>Mais Definições</strong>. Defina as <strong>Margens</strong> como <strong>Nenhuma</strong> e ative a opção <strong>Gráficos de Fundo</strong>.</li>
            <li>Assim, as páginas físicas ficarão idênticas ao modelo A4 abaixo!</li>
          </ol>
        </div>

        {/* CONTAINER FÍSICO DAS PÁGINAS A4 */}
        <div className="catalog-pages-container">
          
          {/* 1. CAPA INICIAL */}
          {includeCover && (
            <div className="a4-page cover-page">
              <div className="cover-header">
                <div className="cover-logo-arch"></div>
                <div className="cover-title">{companyName}</div>
                <div className="cover-subtitle">{companyTagline}</div>
                <div className="cover-decor-line"></div>
              </div>
              
              <div className="cover-hero-image-container">
                <img 
                  src={`https://drive.google.com/thumbnail?id=${coverImageId}&sz=w1000`} 
                  alt="Capa Casaê" 
                  className="cover-hero-image"
                  onError={(e) => {
                    e.target.src = "https://www.gstatic.com/images/icons/material/system/1x/broken_image_grey600_18dp.png";
                  }}
                />
              </div>
              
              <div className="cover-footer">
                <div className="cover-footer-text">{catalogSubtitle}</div>
                <div className="cover-footer-sub">{catalogYear}</div>
              </div>
            </div>
          )}

          {/* 2. PÁGINAS DE CONTEÚDO (PRODUTOS AGRUPADOS POR CATEGORIA) */}
          {totalContentPages === 0 ? (
            <div className="a4-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px' }}>Nenhum produto selecionado</h3>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>Ative produtos ou altere os filtros na barra lateral.</p>
              </div>
            </div>
          ) : (
            pagesOfProducts.map((pageData, pageIdx) => {
              const pageItems = pageData.items;
              const headerCategoryLabel = pageData.category;
              const physicalPageNum = (includeCover ? 1 : 0) + pageIdx + 1;
              const pageIndicator = pageData.totalCategoryPages > 1 
                ? `${headerCategoryLabel} (${pageData.pageIdxInCategory + 1}/${pageData.totalCategoryPages})` 
                : headerCategoryLabel;

              return (
                <div key={pageIdx} className="a4-page">
                  {/* Cabeçalho da Página */}
                  <header className="page-header">
                    <div className="page-header-brand">
                      <span className="page-header-logo">{companyName}</span>
                      <span className="page-header-tagline">{companyTagline}</span>
                    </div>
                    <span className="page-header-category">{pageIndicator}</span>
                  </header>

                  {/* Grid de Itens */}
                  <div className={`catalog-grid cols-${gridCols}`}>
                    {pageItems.map(prod => (
                      <article 
                        key={prod.id} 
                        className={`catalog-item ${!prod.isActive ? 'inactive' : ''}`}
                      >
                        <div className="catalog-item-image-wrapper">
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.name} 
                            className="catalog-item-image"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = "https://www.gstatic.com/images/icons/material/system/1x/broken_image_grey600_18dp.png";
                            }}
                          />
                          
                          {/* Botão de Edição Rápida por Hover */}
                          <div className="catalog-item-edit-overlay" onClick={() => handleSelectProductForEditing(prod)}>
                            <button className="btn-edit-overlay">
                              <Edit2 size={11} /> Editar
                            </button>
                          </div>
                        </div>
                        <div className="catalog-item-meta">
                          <span className="catalog-item-category">{prod.category}</span>
                          <h3 className="catalog-item-title">{prod.name}</h3>
                          {showDescriptions && (
                            <p className="catalog-item-desc">{prod.description}</p>
                          )}
                          <div className="catalog-item-price-row">
                            <span className="catalog-item-price">R$ {prod.price.toFixed(2)}</span>
                            {showCode && (
                              <span className="catalog-item-code">
                                REF: #{prod.id.replace('prod_', '').substring(0, 5).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Rodapé da Página */}
                  <footer className="page-footer">
                    <span className="page-footer-note">{catalogYear}</span>
                    <span className="page-number">Página {physicalPageNum}</span>
                  </footer>
                </div>
              );
            })
          )}

          {/* 3. CONTRA-CAPA */}
          {includeBackCover && (
            <div className="a4-page back-cover-page">
              <div className="back-cover-content">
                <div>
                  <div className="cover-logo-arch" style={{ margin: '0 auto 16px' }}></div>
                  <div className="back-cover-logo">{companyName}</div>
                  <div className="cover-footer-sub" style={{ fontSize: '16px' }}>{companyTagline}</div>
                </div>

                <p className="back-cover-message">
                  “Uma casa que sente. Cores, aromas e texturas que transformam espaços em lares de verdade.”
                </p>

                <div className="back-cover-contacts">
                  <div className="contact-item">
                    <span className="contact-label">Instagram</span>
                    <span className="contact-value">{instagram}</span>
                  </div>
                  
                  <div className="contact-item">
                    <span className="contact-label">Contato / WhatsApp</span>
                    <span className="contact-value">{phone}</span>
                  </div>

                  {website && (
                    <div className="contact-item">
                      <span className="contact-label">Nosso Site</span>
                      <span className="contact-value">{website}</span>
                    </div>
                  )}

                  {email && (
                    <div className="contact-item">
                      <span className="contact-label">E-mail</span>
                      <span className="contact-value">{email}</span>
                    </div>
                  )}

                  <div className="contact-item" style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                    <span className="contact-label">Endereço</span>
                    <span className="contact-value" style={{ fontSize: '13px', fontWeight: '400', lineHeight: '1.4' }}>
                      {address}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {catalogYear} — Todos os direitos reservados.
                  </p>
                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Preços e disponibilidade sujeitos a alterações sem aviso prévio.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
