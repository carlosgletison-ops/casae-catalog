import { useState, useEffect } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import initialProducts from './data/products.json';

// Helper function to generate unique product IDs to satisfy react compiler purity rule
const generateProductId = () => `prod_${Date.now()}`;

// IndexedDB wrapper to bypass localStorage size limit (5MB) when storing Base64 images
const DB_NAME = 'CasaeCatalogDB';
const STORE_NAME = 'stateStore';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const getIDBState = async (key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB read error:", e);
    return null;
  }
};

const setIDBState = async (key, val) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(val, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB write error:", e);
  }
};

function App() {
  const defaultCategories = ["Tecidos", "Porcelanas", "Decoração", "Essências", "Linha Corpo"];
  const defaultProducts = initialProducts.map(p => ({ ...p, isActive: true }));
  const initialImages = initialProducts.map(p => ({
    id: p.imageId,
    name: p.imageName,
    url: p.imageUrl,
    isDrive: p.imageUrl.includes('drive.google.com')
  }));
  const defaultImages = initialImages.filter((value, index, self) =>
    self.findIndex(t => t.id === value.id) === index
  );

  // Lista de categorias dinâmicas que podem ser editadas pelo usuário
  const [categoriesList, setCategoriesList] = useState(defaultCategories);

  // Estado principal carregando do localStorage ou arquivo JSON inicial com migração
  const [products, setProducts] = useState(defaultProducts);

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
  const [coverImageId, setCoverImageId] = useState('12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8');

  // Estado da Interface
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'settings' ou 'uploads'
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Estado de imagens disponíveis (originais, uploads locais e drive importados)
  const [availableImages, setAvailableImages] = useState(defaultImages);

  // Flag de carregamento completo
  const [isLoaded, setIsLoaded] = useState(false);

  // Auxiliar para salvar no servidor
  const saveToServer = async (statePayload) => {
    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statePayload)
      });
    } catch (e) {
      console.error("Erro ao salvar no servidor", e);
    }
  };

  // Carregar e sincronizar estado no montamento
  useEffect(() => {
    const syncWithServer = async () => {
      let localState = null;
      try {
        // Tentar ler do IndexedDB primeiro devido ao limite do localStorage
        localState = await getIDBState('casae_catalog_full_state_v3');
        
        if (!localState) {
          const fullStateStr = localStorage.getItem('casae_catalog_full_state_v3');
          if (fullStateStr) {
            localState = JSON.parse(fullStateStr);
          } else {
            const oldProducts = localStorage.getItem('casae_catalog_products_v3');
            const oldCategories = localStorage.getItem('casae_catalog_categories_v3');
            const oldImages = localStorage.getItem('casae_catalog_available_images_v3');
            
            if (oldProducts || oldCategories || oldImages) {
              localState = {
                products: oldProducts ? JSON.parse(oldProducts) : defaultProducts,
                categoriesList: oldCategories ? JSON.parse(oldCategories) : defaultCategories,
                availableImages: oldImages ? JSON.parse(oldImages) : defaultImages,
                settings: {
                  companyName: localStorage.getItem('casae_companyName') || 'Casaê',
                  companyTagline: localStorage.getItem('casae_companyTagline') || 'Decoração e Tecidos',
                  catalogSubtitle: localStorage.getItem('casae_catalogSubtitle') || 'Curadoria & Catálogo de Preços',
                  catalogYear: localStorage.getItem('casae_catalogYear') || 'Coleção Outono / Inverno 2026',
                  phone: localStorage.getItem('casae_phone') || '(32) 99881-2233',
                  instagram: localStorage.getItem('casae_instagram') || '@casae_loja',
                  email: localStorage.getItem('casae_email') || 'contato@casae.com.br',
                  address: localStorage.getItem('casae_address') || 'Rua Direita, 45 — Centro Histórico, Tiradentes - MG',
                  website: localStorage.getItem('casae_website') || 'casae-contato.vercel.app',
                  gridCols: Number(localStorage.getItem('casae_gridCols')) || 2,
                  showDescriptions: localStorage.getItem('casae_showDescriptions') !== 'false',
                  showCode: localStorage.getItem('casae_showCode') !== 'false',
                  includeCover: localStorage.getItem('casae_includeCover') !== 'false',
                  includeBackCover: localStorage.getItem('casae_includeBackCover') !== 'false',
                  coverImageId: localStorage.getItem('casae_coverImageId') || '12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8'
                },
                lastUpdated: Date.now()
              };
            }
          }
        }
      } catch (e) {
        console.error("Erro ao carregar estado local", e);
      }

      let serverState = null;
      try {
        const response = await fetch('/api/catalog');
        if (response.ok) {
          const text = await response.text();
          if (text) {
            serverState = JSON.parse(text);
          }
        }
      } catch (e) {
        console.error("Erro ao buscar do servidor", e);
      }

      let chosenState = null;
      const serverHasData = serverState && serverState.products && serverState.products.length > 0;
      const localHasData = localState && localState.products && localState.products.length > 0;

      if (serverHasData && localHasData) {
        if (localState.lastUpdated > (serverState.lastUpdated || 0)) {
          console.log("Estado local mais novo detectado. Atualizando servidor...");
          chosenState = localState;
          await saveToServer(localState);
        } else {
          console.log("Estado do servidor mais novo. Atualizando local...");
          chosenState = serverState;
          try {
            localStorage.setItem('casae_catalog_full_state_v3', JSON.stringify(serverState));
          } catch (e) {
            console.warn("Falha ao salvar no localStorage (cota excedida), prosseguindo com IndexedDB", e);
          }
          await setIDBState('casae_catalog_full_state_v3', serverState);
        }
      } else if (serverHasData) {
        console.log("Estado do servidor carregado.");
        chosenState = serverState;
        try {
          localStorage.setItem('casae_catalog_full_state_v3', JSON.stringify(serverState));
        } catch (e) {
          console.warn("Falha ao salvar no localStorage (cota excedida), prosseguindo com IndexedDB", e);
        }
        await setIDBState('casae_catalog_full_state_v3', serverState);
      } else if (localHasData) {
        console.log("Estado local carregado. Sincronizando com servidor...");
        chosenState = localState;
        await saveToServer(localState);
      } else {
        console.log("Carregando padrões e inicializando servidor...");
        chosenState = {
          products: defaultProducts,
          categoriesList: defaultCategories,
          availableImages: defaultImages,
          settings: {
            companyName: 'Casaê',
            companyTagline: 'Decoração e Tecidos',
            catalogSubtitle: 'Curadoria & Catálogo de Preços',
            catalogYear: 'Coleção Outono / Inverno 2026',
            phone: '(32) 99881-2233',
            instagram: '@casae_loja',
            email: 'contato@casae.com.br',
            address: 'Rua Direita, 45 — Centro Histórico, Tiradentes - MG',
            website: 'casae-contato.vercel.app',
            gridCols: 2,
            showDescriptions: true,
            showCode: true,
            includeCover: true,
            includeBackCover: true,
            coverImageId: '12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8'
          },
          lastUpdated: Date.now()
        };
        await saveToServer(chosenState);
      }

      if (chosenState) {
        setProducts(chosenState.products);
        setCategoriesList(chosenState.categoriesList);
        setAvailableImages(chosenState.availableImages);
        
        const s = chosenState.settings || {};
        if (s.companyName !== undefined) setCompanyName(s.companyName);
        if (s.companyTagline !== undefined) setCompanyTagline(s.companyTagline);
        if (s.catalogSubtitle !== undefined) setCatalogSubtitle(s.catalogSubtitle);
        if (s.catalogYear !== undefined) setCatalogYear(s.catalogYear);
        if (s.phone !== undefined) setPhone(s.phone);
        if (s.instagram !== undefined) setInstagram(s.instagram);
        if (s.email !== undefined) setEmail(s.email);
        if (s.address !== undefined) setAddress(s.address);
        if (s.website !== undefined) setWebsite(s.website);
        if (s.gridCols !== undefined) setGridCols(s.gridCols);
        if (s.showDescriptions !== undefined) setShowDescriptions(s.showDescriptions);
        if (s.showCode !== undefined) setShowCode(s.showCode);
        if (s.includeCover !== undefined) setIncludeCover(s.includeCover);
        if (s.includeBackCover !== undefined) setIncludeBackCover(s.includeBackCover);
        if (s.coverImageId !== undefined) setCoverImageId(s.coverImageId);
      }
      setIsLoaded(true);
    };
    
    syncWithServer();
  }, []);

  // Salvar estado localmente e enviar debounced para o servidor ao mudar
  useEffect(() => {
    if (!isLoaded) return;

    const fullState = {
      products,
      categoriesList,
      availableImages,
      settings: {
        companyName,
        companyTagline,
        catalogSubtitle,
        catalogYear,
        phone,
        instagram,
        email,
        address,
        website,
        gridCols,
        showDescriptions,
        showCode,
        includeCover,
        includeBackCover,
        coverImageId
      },
      lastUpdated: Date.now()
    };

    // Salvar no IndexedDB (sem limites estritos de tamanho)
    setIDBState('casae_catalog_full_state_v3', fullState);

    // Salvar no localStorage como fallback rápido, silenciando erros de cota
    try {
      localStorage.setItem('casae_catalog_full_state_v3', JSON.stringify(fullState));
    } catch (e) {
      console.warn("localStorage quota exceeded, using IndexedDB and server as fallback.", e);
    }

    const timeoutId = setTimeout(() => {
      saveToServer(fullState);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    isLoaded,
    products,
    categoriesList,
    availableImages,
    companyName,
    companyTagline,
    catalogSubtitle,
    catalogYear,
    phone,
    instagram,
    email,
    address,
    website,
    gridCols,
    showDescriptions,
    showCode,
    includeCover,
    includeBackCover,
    coverImageId
  ]);

  // Estados para importação do Google Drive
  const [driveUrlInput, setDriveUrlInput] = useState('https://drive.google.com/drive/folders/1pyRnlVdneHazdxZHCCsuOq6AzWe4mzbT?usp=sharing');
  const [isImporting, setIsImporting] = useState(false);

  // Estados para gerenciamento de categorias
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Restaurar dados originais
  const handleResetData = () => {
    if (window.confirm("Deseja mesmo redefinir o catálogo para as 50 fotos originais do Drive com as novas categorias? Suas alterações serão perdidas.")) {
      setProducts(initialProducts.map(p => ({ ...p, isActive: true })));
      setSelectedProduct(null);
      
      const initial = initialProducts.map(p => ({
        id: p.imageId,
        name: p.imageName,
        url: p.imageUrl,
        isDrive: true
      }));
      const uniqueInitial = initial.filter((value, index, self) =>
        self.findIndex(t => t.id === value.id) === index
      );
      setAvailableImages(uniqueInitial);
      setCoverImageId(initialProducts[0].imageId);
    }
  };

  // Gerenciamento de Categorias
  const handleAddCategory = (newCatName) => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categoriesList.includes(trimmed)) {
      alert("Esta categoria já existe!");
      return;
    }
    setCategoriesList([...categoriesList, trimmed]);
  };

  const handleRenameCategory = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    if (categoriesList.includes(trimmed)) {
      alert("Esta categoria já existe!");
      return;
    }
    setCategoriesList(categoriesList.map(cat => cat === oldName ? trimmed : cat));
    setProducts(products.map(p => p.category === oldName ? { ...p, category: trimmed } : p));
    if (selectedProduct && selectedProduct.category === oldName) {
      setSelectedProduct({ ...selectedProduct, category: trimmed });
    }
    if (selectedCategoryFilter === oldName) {
      setSelectedCategoryFilter(trimmed);
    }
  };

  const handleDeleteCategory = (catName) => {
    if (categoriesList.length <= 1) {
      alert("O catálogo precisa ter pelo menos uma categoria!");
      return;
    }
    
    const count = products.filter(p => p.category === catName).length;
    if (count > 0) {
      const confirmDelete = window.confirm(
        `Existem ${count} produto(s) na categoria "${catName}". Se você excluí-la, esses produtos serão movidos para a categoria "${categoriesList.find(c => c !== catName)}". Deseja continuar?`
      );
      if (!confirmDelete) return;
    }

    const fallbackCategory = categoriesList.find(c => c !== catName);
    
    setCategoriesList(categoriesList.filter(c => c !== catName));
    setProducts(products.map(p => p.category === catName ? { ...p, category: fallbackCategory } : p));
    if (selectedProduct && selectedProduct.category === catName) {
      setSelectedProduct({ ...selectedProduct, category: fallbackCategory });
    }
    if (selectedCategoryFilter === catName) {
      setSelectedCategoryFilter('Todos');
    }
  };

  // Upload Local de Arquivos de Imagem
  const handleLocalUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImg = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          url: event.target.result,
          isDrive: false
        };
        setAvailableImages(prev => [newImg, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Importar arquivos/pasta do Google Drive
  const handleImportFromDrive = async () => {
    if (!driveUrlInput.trim()) {
      alert("Por favor, digite um link do Google Drive.");
      return;
    }

    setIsImporting(true);

    const isFolder = driveUrlInput.includes('/folders/') || driveUrlInput.includes('/drive/folders/');
    const isFile = driveUrlInput.includes('/file/d/') || driveUrlInput.includes('id=');

    if (isFolder) {
      const folderIdMatch = driveUrlInput.match(/\/folders\/([a-zA-Z0-9_-]{28,35})/);
      const folderId = folderIdMatch ? folderIdMatch[1] : null;

      if (!folderId) {
        alert("Não foi possível identificar o ID da pasta no link. Verifique o link e tente novamente.");
        setIsImporting(false);
        return;
      }

      try {
        const targetUrl = `https://drive.google.com/drive/folders/${folderId}`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Erro na resposta do servidor proxy.");
        
        const html = await res.text();
        
        const regex = /data-id="([a-zA-Z0-9_-]{28,35})"[^>]*?data-tooltip="([^"]+?)(?:\s+Image)?"/g;
        const results = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
          results.push({ id: match[1], name: match[2].trim() });
        }

        if (results.length === 0) {
          const unescapedHtml = html
            .replace(/\\x22/g, '"')
            .replace(/\\x5b/g, '[')
            .replace(/\\x5d/g, ']')
            .replace(/\\x2f/g, '/');
          
          const fbRegex = /"([a-zA-Z0-9_-]{28,35})",\s*\[\s*"([a-zA-Z0-9_-]{20,})"\s*\],\s*"([^"]+)"/g;
          let fbMatch;
          while ((fbMatch = fbRegex.exec(unescapedHtml)) !== null) {
            results.push({ id: fbMatch[1], name: fbMatch[3].trim() });
          }
        }

        const uniqueResults = results.filter((val, idx, self) =>
          self.findIndex(t => t.id === val.id) === idx
        );

        if (uniqueResults.length === 0) {
          alert("Nenhuma imagem pública foi encontrada nesta pasta. Certifique-se de que a pasta está compartilhada como 'Qualquer pessoa com o link pode ler'.");
          setIsImporting(false);
          return;
        }

        const newImages = uniqueResults.map(file => ({
          id: file.id,
          name: file.name,
          url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
          isDrive: true
        }));

        setAvailableImages(prev => {
          const existingIds = new Set(prev.map(img => img.id));
          const filteredNew = newImages.filter(img => !existingIds.has(img.id));
          return [...filteredNew, ...prev];
        });

        // Criar produtos automaticamente para as novas imagens que não estão cadastradas
        const newProducts = [];
        uniqueResults.forEach((file, idx) => {
          const exists = products.some(p => p.imageId === file.id);
          if (!exists) {
            const cat = categoriesList[idx % categoriesList.length];
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            newProducts.push({
              id: `prod_drive_${file.id}`,
              name: `${cat} ${cleanName}`,
              category: cat,
              price: 0.00,
              description: `Item elegante da categoria ${cat} com acabamento de alta curadoria.`,
              imageName: file.name,
              imageId: file.id,
              imageUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
              isActive: true
            });
          }
        });

        if (newProducts.length > 0) {
          setProducts(prev => [...prev, ...newProducts]);
        }

        alert(`Importação concluída! ${uniqueResults.length} imagens carregadas e ${newProducts.length} novos produtos adicionados e categorizados!`);
      } catch (err) {
        console.error("Erro ao importar do drive", err);
        alert("Ocorreu um erro ao importar a pasta. Verifique se o link é público e tente novamente.");
      }
    } else if (isFile) {
      let fileId = null;
      const fileIdMatch1 = driveUrlInput.match(/\/file\/d\/([a-zA-Z0-9_-]{28,35})/);
      if (fileIdMatch1) {
        fileId = fileIdMatch1[1];
      } else {
        const fileIdMatch2 = driveUrlInput.match(/[?&]id=([a-zA-Z0-9_-]{28,35})/);
        if (fileIdMatch2) {
          fileId = fileIdMatch2[1];
        }
      }

      if (!fileId) {
        alert("Não foi possível identificar o ID do arquivo no link.");
        setIsImporting(false);
        return;
      }

      const newImg = {
        id: fileId,
        name: `Drive_File_${fileId.substring(0, 6)}`,
        url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
        isDrive: true
      };

      setAvailableImages(prev => {
        if (prev.some(img => img.id === fileId)) {
          alert("Esta imagem já está na galeria.");
          return prev;
        }
        return [newImg, ...prev];
      });

      alert("Imagem do Drive adicionada com sucesso!");
    } else {
      alert("Link inválido. Insira um link válido de pasta ou de arquivo do Google Drive.");
    }

    setIsImporting(false);
  };

  // Criar produto a partir de uma imagem da galeria
  const handleCreateProductFromImage = (img) => {
    const newId = generateProductId();
    const newProd = {
      id: newId,
      name: `Novo Item (${img.name.replace(/\.[^/.]+$/, "")})`,
      category: selectedCategoryFilter === 'Todos' ? 'Decoração' : selectedCategoryFilter,
      price: 0.00,
      description: "Escreva uma breve descrição deste produto elegante para casa.",
      imageName: img.name,
      imageId: img.id,
      imageUrl: img.url,
      isActive: true
    };
    setProducts([newProd, ...products]);
    handleSelectProductForEditing(newProd);
    alert(`Produto criado com a imagem "${img.name}"!`);
  };

  // Definir como imagem da capa
  const handleSetAsCoverImage = (imgId) => {
    setCoverImageId(imgId);
    alert("Definido como imagem de destaque da capa!");
  };

  // Excluir imagem
  const handleDeleteImage = (imgId) => {
    const inUse = products.some(p => p.imageId === imgId);
    const isCover = coverImageId === imgId;
    
    if (inUse || isCover) {
      let msg = "Esta imagem está sendo usada ";
      if (inUse && isCover) msg += "como capa e por um ou mais produtos.";
      else if (inUse) msg += "por um ou mais produtos.";
      else msg += "como capa.";
      
      alert(`${msg} Não é possível excluí-la.`);
      return;
    }

    if (window.confirm("Excluir esta imagem da galeria?")) {
      setAvailableImages(availableImages.filter(img => img.id !== imgId));
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
        console.error("Erro ao importar dados", err);
        alert("Erro ao ler o arquivo JSON.");
      }
    };
  };

  // Adicionar Novo Produto
  const handleAddProduct = () => {
    const newId = generateProductId();
    const defaultImg = availableImages[0] || {
      name: "DSC00001.JPG",
      id: "12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8",
      url: "https://drive.google.com/thumbnail?id=12Hj7fwMSlqlvjX7qTGNfKTyVx9QiHY-8&sz=w800"
    };
    const newProd = {
      id: newId,
      name: "Novo Item de Decoração",
      category: selectedCategoryFilter === 'Todos' ? 'Decoração' : selectedCategoryFilter,
      price: 0.00,
      description: "Escreva uma breve descrição deste produto elegante para casa.",
      imageName: defaultImg.name,
      imageId: defaultImg.id,
      imageUrl: defaultImg.url,
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
    
    // Se mudou a imagem, atualizar a URL
    if (updatedField === 'imageId') {
      const selectedImg = availableImages.find(img => img.id === value);
      if (selectedImg) {
        updated.imageName = selectedImg.name;
        updated.imageUrl = selectedImg.url;
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

  const coverImg = availableImages.find(img => img.id === coverImageId);
  const coverImgSrc = coverImg ? (coverImg.isDrive ? `https://drive.google.com/thumbnail?id=${coverImg.id}&sz=w1000` : coverImg.url) : `https://drive.google.com/thumbnail?id=${coverImageId}&sz=w1000`;

  const handlePrint = () => {
    window.print();
  };

  if (!isLoaded) {
    return (
      <div className="loading-overlay" style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--text-main)' }}>Carregando catálogo da Casaê...</p>
      </div>
    );
  }

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
          <button 
            className={`tab-btn ${activeTab === 'uploads' ? 'active' : ''}`}
            onClick={() => setActiveTab('uploads')}
          >
            <Upload size={16} style={{ marginBottom: '-3px', marginRight: '4px' }} />
            Uploads ({availableImages.length})
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
                    <label>Selecionar Foto</label>
                    <select
                      value={selectedProduct.imageId}
                      onChange={(e) => handleUpdateProduct('imageId', e.target.value)}
                    >
                      {availableImages.map((img) => (
                        <option key={img.id} value={img.id}>
                          {img.isDrive ? `Drive: ${img.name}` : `Local: ${img.name}`}
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

              <div className="section-title" style={{ marginTop: '16px' }}>Categorias do Catálogo</div>
              
              <div className="category-add-form" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Nova categoria..." 
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCategory(newCategoryInput);
                      setNewCategoryInput('');
                    }
                  }}
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    handleAddCategory(newCategoryInput);
                    setNewCategoryInput('');
                  }}
                  style={{ padding: '10px 14px' }}
                  type="button"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="categories-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {categoriesList.map(cat => {
                  const isEditing = editingCategory === cat;
                  const prodCount = products.filter(p => p.category === cat && p.isActive).length;
                  
                  return (
                    <div key={cat} className="category-item-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#faf9f6',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      gap: '8px'
                    }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          style={{
                            flex: 1,
                            fontSize: '13px',
                            padding: '4px 8px',
                            border: '1px solid var(--accent)',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameCategory(cat, renameValue);
                              setEditingCategory(null);
                            } else if (e.key === 'Escape') {
                              setEditingCategory(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {prodCount} produto(s) ativo(s)
                          </span>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {isEditing ? (
                          <>
                            <button 
                              className="btn-card-action" 
                              onClick={() => {
                                handleRenameCategory(cat, renameValue);
                                setEditingCategory(null);
                              }}
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              type="button"
                            >
                              Salvar
                            </button>
                            <button 
                              className="btn-card-action" 
                              onClick={() => setEditingCategory(null)}
                              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#e5e5e5', color: '#666' }}
                              type="button"
                            >
                              Canc.
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="btn-icon-only" 
                              onClick={() => {
                                setEditingCategory(cat);
                                setRenameValue(cat);
                              }}
                              title="Renomear categoria"
                              style={{ padding: '6px' }}
                              type="button"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn-icon-only" 
                              onClick={() => handleDeleteCategory(cat)}
                              title="Excluir categoria"
                              style={{ padding: '6px' }}
                              type="button"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                    {availableImages.map((img) => (
                      <option key={img.id} value={img.id}>
                        {img.isDrive ? `Drive: ${img.name}` : `Local: ${img.name}`}
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

          {/* TAB 3: UPLOADS E GOOGLE DRIVE */}
          {activeTab === 'uploads' && (
            <div className="editor-section">
              <div className="section-title">Upload de Imagens</div>
              
              {/* Opção 1: Upload Local */}
              <div className="upload-box local-upload">
                <label className="upload-label">
                  <Upload size={20} />
                  <span>Selecionar Foto Local</span>
                  <p>Arraste ou clique para enviar (PNG, JPG)</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLocalUpload} 
                    multiple
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>

              {/* Opção 2: Importar do Drive */}
              <div className="drive-import-box">
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  Subir Pasta do Google Drive
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input 
                    type="text" 
                    placeholder="Link da pasta do Google Drive..." 
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <button 
                    className="btn-primary" 
                    onClick={handleImportFromDrive}
                    disabled={isImporting}
                    style={{ padding: '10px 14px' }}
                  >
                    {isImporting ? '...' : 'Importar'}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Cole o link de uma pasta compartilhada (Leitor público) do Drive para carregar as fotos no catálogo.
                </p>
              </div>

              {/* Galeria de Fotos Disponíveis */}
              <div className="section-title" style={{ marginTop: '16px' }}>Galeria de Imagens ({availableImages.length})</div>
              
              {isImporting && (
                <div className="loading-spinner-container">
                  <div className="spinner"></div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Carregando fotos do Drive...</p>
                </div>
              )}

              <div className="available-images-grid">
                {availableImages.map((img) => (
                  <div key={img.id} className="available-image-card">
                    <img 
                      src={img.url} 
                      alt={img.name} 
                      onError={(e) => {
                        e.target.src = "https://www.gstatic.com/images/icons/material/system/1x/broken_image_grey600_18dp.png";
                      }}
                    />
                    <div className="image-card-info">
                      <div className="image-card-name" title={img.name}>{img.name}</div>
                      <div className="image-card-actions">
                        <button 
                          className="btn-card-action"
                          onClick={() => handleCreateProductFromImage(img)}
                          title="Criar novo produto com esta imagem"
                        >
                          + Produto
                        </button>
                        <button 
                          className="btn-card-action"
                          onClick={() => handleSetAsCoverImage(img.id)}
                          title="Usar na capa"
                        >
                          Capa
                        </button>
                        <button 
                          className="btn-card-action btn-card-delete"
                          onClick={() => handleDeleteImage(img.id)}
                          title="Excluir imagem"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                  src={coverImgSrc} 
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
