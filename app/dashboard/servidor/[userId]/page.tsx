"use client";
import { useRouter } from "next/navigation";
import { LogOut, Server, ArrowLeft, Upload, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";

interface CanalM3U {
  tvgId: string;
  tvgName: string;
  tvgLogo: string;
  groupTitle: string;
  name: string;
  url: string;
  protocolo: string;
  selecionado: boolean;
}

interface SaasUser {
  id: string;
  serverName: string;
  serverUrl: string;
  apiKey: string;
  username?: string;
  password?: string;
  email: string;
  type: "admin" | "user";
  createdAt: string;
}

export default function ServidorUsuario() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [m3uText, setM3uText] = useState("");
  const [canais, setCanais] = useState<CanalM3U[]>([]);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userData, setUserData] = useState<SaasUser | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [canaisServidor, setCanaisServidor] = useState<any[]>([]);
  const [selectedToDelete, setSelectedToDelete] = useState<number[]>([]);
  const [loadingCanaisServidor, setLoadingCanaisServidor] = useState(false);

  // Buscar dados do usuário ao carregar
  React.useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/users`);
      if (res.ok) {
        const users = await res.json();
        const user = users.find((u: SaasUser) => u.id == userId);
        setUserData(user || null);
      }
    }
    if (userId) fetchUser();
  }, [userId]);

  const handleLogout = async () => {
    // Limpar localStorage
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("currentUser");
    
    // Chamar API de logout para remover cookies
    await fetch("/api/logout");
    
    // Redirecionar para página inicial
    router.push("/");
  };

  // Upload de arquivo
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/emby/upload-m3u', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setCanais([]);
      } else {
        setCanais((data.canais || []).map((c: any) => ({ ...c, protocolo: 'Http', selecionado: true })));
      }
    } catch {
      toast.error('Erro ao enviar arquivo');
      setCanais([]);
    }
    setLoading(false);
  }

  // Download via URL
  async function handleUrlDownload() {
    if (!urlInput) return;
    setLoading(true);
    try {
      const res = await fetch('/api/emby/download-m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setCanais([]);
      } else {
        setCanais((data.canais || []).map((c: any) => ({ ...c, protocolo: 'Http', selecionado: true })));
      }
    } catch {
      toast.error('Erro ao baixar/processar arquivo');
      setCanais([]);
    }
    setLoading(false);
  }

  // Estado para armazenar o último canal clicado (para seleção com Shift)
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  // Estado para filtro de busca
  const [searchFilter, setSearchFilter] = useState("");
  // Estado para filtro de grupo
  const [groupFilter, setGroupFilter] = useState<string>("");

  // Selecionar/desmarcar canal com suporte a seleção múltipla com Shift
  function toggleCanal(idx: number, isShiftKey: boolean = false) {
    if (isShiftKey && lastSelectedIndex !== null) {
      // Seleção com Shift - seleciona todos os canais entre o último selecionado e o atual
      const start = Math.min(lastSelectedIndex, idx);
      const end = Math.max(lastSelectedIndex, idx);
      
      setCanais(canais => canais.map((c, i) => {
        if (i >= start && i <= end) {
          return { ...c, selecionado: true };
        }
        return c;
      }));
    } else {
      // Seleção normal - toggle único canal
      setCanais(canais => canais.map((c, i) => i === idx ? { ...c, selecionado: !c.selecionado } : c));
    }
    
    // Atualiza o último índice selecionado
    setLastSelectedIndex(idx);
  }

  // Alterar protocolo
  function setProtocolo(idx: number, protocolo: string) {
    setCanais(canais => canais.map((c, i) => i === idx ? { ...c, protocolo } : c));
  }

  // Selecionar/desmarcar todos os canais
  function handleSelectAll() {
    const allSelected = canais.every(c => c.selecionado);
    setCanais(canais.map(c => ({ ...c, selecionado: !allSelected })));
  }
  
  // Selecionar canais por grupo
  function selectByGroup(group: string) {
    setCanais(canais => canais.map(c => {
      if (c.groupTitle === group) {
        return { ...c, selecionado: true };
      }
      return c;
    }));
  }
  
  // Obter lista de grupos únicos
  const uniqueGroups = React.useMemo(() => {
    const groups = canais.map(c => c.groupTitle).filter(Boolean);
    return [...new Set(groups)];
  }, [canais]);
  
  // Filtrar canais com base na busca e grupo
  const filteredCanais = React.useMemo(() => {
    return canais.filter(canal => {
      const nameMatch = (canal.tvgName || canal.name).toLowerCase().includes(searchFilter.toLowerCase());
      const groupMatch = !groupFilter || canal.groupTitle === groupFilter;
      return nameMatch && groupMatch;
    });
  }, [canais, searchFilter, groupFilter]);
  
  // Inverter seleção (selecionar não selecionados e vice-versa)
  function invertSelection() {
    setCanais(canais => canais.map(c => ({ ...c, selecionado: !c.selecionado })));
  }

  async function handleSend() {
    if (!userData) return toast.error("Dados do usuário não encontrados.");
    setSending(true);
    setProgressText("");
    try {
      // 1. Autenticar no Emby
      const authRes = await fetch(`${userData.serverUrl}/emby/Users/AuthenticateByName?api_key=${userData.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ Username: "painel", Pw: "#140795Hygor#" })
      });
      if (!authRes.ok) throw new Error("Falha na autenticação no Emby");
      const authData = await authRes.json();
      const accessToken = authData.AccessToken;
      const embyUserId = authData.User?.Id;
      if (!accessToken || !embyUserId) throw new Error("Token ou UserId não retornados");

      // 2. Montar payload
      const canaisSelecionados = canais.filter(c => c.selecionado).map(c => ({
        Name: c.tvgName || c.name,
        Image: c.tvgLogo,
        Path: c.url,
        Protocol: c.protocolo,
        UserId: embyUserId
      }));
      if (canaisSelecionados.length === 0) throw new Error("Nenhum canal selecionado");

      setProgressText(`Enviando ${canaisSelecionados.length} canais...`);
      // 3. Enviar todos de uma vez
      const pluginUrl = `${userData.serverUrl}/emby/Plugins/c333f63b-83e9-48d2-8b9a-c5aba546fb1e/Configuration?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Opera+Windows&X-Emby-Device-Id=71941c5c-eea8-403b-ab68-cb01a7f224de&X-Emby-Client-Version=4.8.11.0&X-Emby-Token=${accessToken}&X-Emby-Language=pt-br&reqformat=json`;
      const res = await fetch(pluginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Bookmarks: canaisSelecionados })
      });
      if (!res.ok) throw new Error("Erro ao enviar canais para o Emby");
      setProgressText("Envio concluído!");
      toast.success("Todos os canais enviados!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar canais");
      setProgressText("Erro ao enviar canais");
    }
    setSending(false);
  }

  // Buscar canais já cadastrados no servidor
  async function fetchCanaisServidor(token: string) {
    if (!userData) return;
    setLoadingCanaisServidor(true);
    try {
      const url = `${userData.serverUrl}/emby/Plugins/c333f63b-83e9-48d2-8b9a-c5aba546fb1e/Configuration?X-Emby-Token=${token}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar canais do servidor");
      const data = await res.json();
      setCanaisServidor(data.Bookmarks || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar canais do servidor");
    }
    setLoadingCanaisServidor(false);
  }

  // Atualizar lista após envio ou exclusão
  async function refreshCanaisServidor(accessToken: string) {
    await fetchCanaisServidor(accessToken);
  }

  // Adicionar busca automática após autenticação
  async function getAccessTokenAndFetchCanais() {
    if (!userData) return;
    try {
      const authRes = await fetch(`${userData.serverUrl}/emby/Users/AuthenticateByName?api_key=${userData.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ Username: "painel", Pw: "#140795Hygor#" })
      });
      if (!authRes.ok) throw new Error("Falha na autenticação no Emby");
      const authData = await authRes.json();
      const accessToken = authData.AccessToken;
      if (!accessToken) throw new Error("Token não retornado");
      await fetchCanaisServidor(accessToken);
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar e buscar canais");
    }
  }

  React.useEffect(() => {
    if (userData) getAccessTokenAndFetchCanais();
    // eslint-disable-next-line
  }, [userData]);

  // Seleção de canais para deletar
  function toggleDelete(idx: number) {
    setSelectedToDelete(sel => sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]);
  }
  function selectAllToDelete() {
    setSelectedToDelete(canaisServidor.map((_, idx) => idx));
  }
  function clearAllToDelete() {
    setSelectedToDelete([]);
  }

  // Excluir canais selecionados
  async function handleDeleteSelected() {
    if (!userData) return toast.error("Dados do usuário não encontrados.");
    setSending(true);
    setProgressText("");
    try {
      // Autenticar
      const authRes = await fetch(`${userData.serverUrl}/emby/Users/AuthenticateByName?api_key=${userData.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ Username: "painel", Pw: "#140795Hygor#" })
      });
      if (!authRes.ok) throw new Error("Falha na autenticação no Emby");
      const authData = await authRes.json();
      const accessToken = authData.AccessToken;
      if (!accessToken) throw new Error("Token não retornado");
      // Montar nova lista sem os selecionados
      const novaLista = canaisServidor.filter((_, idx) => !selectedToDelete.includes(idx));
      const pluginUrl = `${userData.serverUrl}/emby/Plugins/c333f63b-83e9-48d2-8b9a-c5aba546fb1e/Configuration?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Opera+Windows&X-Emby-Device-Id=71941c5c-eea8-403b-ab68-cb01a7f224de&X-Emby-Client-Version=4.8.11.0&X-Emby-Token=${accessToken}&X-Emby-Language=pt-br&reqformat=json`;
      const res = await fetch(pluginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Bookmarks: novaLista })
      });
      if (!res.ok) throw new Error("Erro ao excluir canais");
      toast.success("Canais excluídos!");
      setSelectedToDelete([]);
      await refreshCanaisServidor(accessToken);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir canais");
    }
    setSending(false);
  }

  // Excluir todos
  async function handleDeleteAll() {
    if (!userData) return toast.error("Dados do usuário não encontrados.");
    setSending(true);
    setProgressText("");
    try {
      // Autenticar
      const authRes = await fetch(`${userData.serverUrl}/emby/Users/AuthenticateByName?api_key=${userData.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ Username: "painel", Pw: "#140795Hygor#" })
      });
      if (!authRes.ok) throw new Error("Falha na autenticação no Emby");
      const authData = await authRes.json();
      const accessToken = authData.AccessToken;
      if (!accessToken) throw new Error("Token não retornado");
      // Enviar lista vazia
      const pluginUrl = `${userData.serverUrl}/emby/Plugins/c333f63b-83e9-48d2-8b9a-c5aba546fb1e/Configuration?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Opera+Windows&X-Emby-Device-Id=71941c5c-eea8-403b-ab68-cb01a7f224de&X-Emby-Client-Version=4.8.11.0&X-Emby-Token=${accessToken}&X-Emby-Language=pt-br&reqformat=json`;
      const res = await fetch(pluginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Bookmarks: [] })
      });
      if (!res.ok) throw new Error("Erro ao excluir todos os canais");
      toast.success("Todos os canais excluídos!");
      setSelectedToDelete([]);
      await refreshCanaisServidor(accessToken);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir todos os canais");
    }
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                className="flex items-center mr-4 px-2 py-1 rounded hover:bg-gray-200 transition"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Voltar
              </button>
              <Server className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Controle do Servidor</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center w-full max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Gerenciamento do Servidor do Usuário</h2>
            <p className="text-gray-600 mb-4">Faça upload ou informe a URL de uma lista M3U para processar os canais.</p>
            <div className="flex gap-4 mb-6 w-full">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload arquivo M3U
              </Button>
              <input
                type="file"
                accept=".m3u,.txt"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Ou cole a URL da lista M3U"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                />
                <Button variant="outline" onClick={handleUrlDownload} disabled={loading || !urlInput}>
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
              </div>
            </div>
            {loading && <div className="text-blue-600 font-semibold mb-4">Processando lista...</div>}
            {canais.length > 0 && (
              <div className="w-full mt-4">
                <h3 className="text-lg font-bold mb-2">Canais encontrados ({canais.length})</h3>
                
                {/* Filtros e controles de seleção */}
                <div className="mb-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {canais.every(c => c.selecionado) ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={invertSelection}>
                      Inverter seleção
                    </Button>
                    
                    {/* Dropdown para seleção por grupo */}
                    <div className="relative">
                      <select 
                        className="border rounded px-2 py-1 text-sm bg-white"
                        value={groupFilter}
                        onChange={(e) => {
                          const value = e.target.value;
                          setGroupFilter(value);
                          if (value) {
                            // Opção para selecionar todos do grupo
                            const confirmSelect = window.confirm(`Deseja selecionar todos os canais do grupo ${value}?`);
                            if (confirmSelect) {
                              selectByGroup(value);
                            }
                          }
                        }}
                      >
                        <option value="">Filtrar por grupo</option>
                        {uniqueGroups.map((group, idx) => (
                          <option key={idx} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Campo de busca */}
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 w-full text-sm"
                        placeholder="Buscar por nome..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Informações de seleção */}
                  <div className="text-sm text-gray-600">
                    {canais.filter(c => c.selecionado).length} de {canais.length} canais selecionados
                    {groupFilter && <span> | Filtrando grupo: {groupFilter}</span>}
                    {searchFilter && <span> | Buscando: "{searchFilter}"</span>}
                    {(groupFilter || searchFilter) && (
                      <button 
                        className="ml-2 text-blue-500 hover:underline"
                        onClick={() => {
                          setGroupFilter("");
                          setSearchFilter("");
                        }}
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-2">
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={filteredCanais.length > 0 && filteredCanais.every(c => c.selecionado)}
                            onChange={() => {
                              const allFiltered = filteredCanais.every(c => c.selecionado);
                              setCanais(canais.map(c => {
                                if (filteredCanais.includes(c)) {
                                  return { ...c, selecionado: !allFiltered };
                                }
                                return c;
                              }));
                            }}
                          />
                        </th>
                        <th className="text-left p-2">Logo</th>
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">Grupo</th>
                        <th className="text-left p-2">URL</th>
                        <th className="text-left p-2">Protocolo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCanais.map((canal, idx) => (
                        <tr 
                          key={idx} 
                          className={canal.selecionado ? "bg-blue-50" : ""}
                          onClick={(e) => {
                            // Não acionar se clicou em um input ou select
                            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
                              return;
                            }
                            // Usar o índice real no array original
                            const realIndex = canais.findIndex(c => c === canal);
                            toggleCanal(realIndex, e.shiftKey);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="cursor-pointer" 
                              checked={canal.selecionado} 
                              onChange={(e) => {
                                // Usar o índice real no array original
                                const realIndex = canais.findIndex(c => c === canal);
                                toggleCanal(realIndex, e.shiftKey);
                              }} 
                            />
                          </td>
                          <td className="p-2">
                            {canal.tvgLogo ? (
                              <img src={canal.tvgLogo} alt={canal.name} className="w-12 h-8 object-contain" />
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="p-2">{canal.tvgName || canal.name}</td>
                          <td className="p-2">{canal.groupTitle || "Sem grupo"}</td>
                          <td className="truncate max-w-xs p-2" title={canal.url}>{canal.url}</td>
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              className="border rounded px-1 py-0.5"
                              value={canal.protocolo}
                              onChange={e => {
                                const realIndex = canais.findIndex(c => c === canal);
                                setProtocolo(realIndex, e.target.value);
                              }}
                            >
                              <option value="Http">Http</option>
                              <option value="File">File</option>
                              <option value="Rtmp">Rtmp</option>
                              <option value="Rtsp">Rtsp</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredCanais.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Nenhum canal encontrado com os filtros atuais.
                  </div>
                )}
                
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const selectedCount = canais.filter(c => c.selecionado).length;
                        if (selectedCount > 0) {
                          if (window.confirm(`Deseja desmarcar os ${selectedCount} canais selecionados?`)) {
                            setCanais(canais.map(c => ({ ...c, selecionado: false })));
                          }
                        }
                      }}
                      disabled={canais.filter(c => c.selecionado).length === 0}
                    >
                      Limpar seleção ({canais.filter(c => c.selecionado).length})
                    </Button>
                  </div>
                  
                  <div>
                    {sending && (
                      <div className="text-xs text-gray-600 mr-2">{progressText}</div>
                    )}
                    <Button 
                      variant="default" 
                      onClick={handleSend} 
                      disabled={sending || canais.filter(c => c.selecionado).length === 0}
                    >
                      {sending ? "Enviando..." : `Enviar ${canais.filter(c => c.selecionado).length} canais selecionados`}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Canais já cadastrados no servidor */}
          <div className="w-full mt-10">
            <h3 className="text-lg font-bold mb-2">Canais já cadastrados no servidor</h3>
            {loadingCanaisServidor ? (
              <div className="text-blue-600 font-semibold mb-4">Carregando canais do servidor...</div>
            ) : canaisServidor.length === 0 ? (
              <div className="text-gray-500">Nenhum canal cadastrado no servidor.</div>
            ) : (
              <div className="mb-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllToDelete}>Selecionar todos</Button>
                <Button variant="outline" size="sm" onClick={clearAllToDelete}>Limpar seleção</Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={selectedToDelete.length === 0 || sending}>Excluir selecionados</Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={canaisServidor.length === 0 || sending}>Excluir todos</Button>
              </div>
            )}
            {canaisServidor.length > 0 && (
              <>
                {/* Filtro de busca para canais cadastrados */}
                <div className="mb-4">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Buscar canais cadastrados..."
                    onChange={(e) => {
                      const searchText = e.target.value.toLowerCase();
                      const filteredIndices = canaisServidor
                        .map((canal, idx) => ({ canal, idx }))
                        .filter(({ canal }) => 
                          canal.Name.toLowerCase().includes(searchText) || 
                          canal.Path.toLowerCase().includes(searchText)
                        )
                        .map(({ idx }) => idx);
                      
                      if (searchText) {
                        setSelectedToDelete(filteredIndices);
                      } else {
                        setSelectedToDelete([]);
                      }
                    }}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Dica: Digite para filtrar e selecionar canais automaticamente. Use Shift+Click para selecionar intervalos.
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-2">
                          <input 
                            type="checkbox" 
                            checked={canaisServidor.length > 0 && selectedToDelete.length === canaisServidor.length} 
                            onChange={() => {
                              if (selectedToDelete.length === canaisServidor.length) {
                                clearAllToDelete();
                              } else {
                                selectAllToDelete();
                              }
                            }} 
                          />
                        </th>
                        <th className="text-left p-2">Logo</th>
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">URL</th>
                        <th className="text-left p-2">Protocolo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {canaisServidor.map((canal, idx) => {
                        // Variável para armazenar o último índice selecionado
                        const isSelected = selectedToDelete.includes(idx);
                        
                        return (
                          <tr 
                            key={idx} 
                            className={isSelected ? "bg-red-50" : ""}
                            onClick={(e) => {
                              // Não acionar se clicou em um input
                              if (e.target instanceof HTMLInputElement) {
                                return;
                              }
                              
                              // Implementar seleção com Shift
                              if (e.shiftKey && selectedToDelete.length > 0) {
                                const lastSelected = selectedToDelete[selectedToDelete.length - 1];
                                const start = Math.min(lastSelected, idx);
                                const end = Math.max(lastSelected, idx);
                                
                                // Criar array com todos os índices no intervalo
                                const range = Array.from(
                                  { length: end - start + 1 },
                                  (_, i) => start + i
                                );
                                
                                // Adicionar intervalo à seleção atual, removendo duplicatas
                                const newSelection = [...new Set([...selectedToDelete, ...range])];
                                setSelectedToDelete(newSelection);
                              } else {
                                // Toggle normal
                                toggleDelete(idx);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={(e) => {
                                  if (e.shiftKey && selectedToDelete.length > 0) {
                                    const lastSelected = selectedToDelete[selectedToDelete.length - 1];
                                    const start = Math.min(lastSelected, idx);
                                    const end = Math.max(lastSelected, idx);
                                    
                                    // Criar array com todos os índices no intervalo
                                    const range = Array.from(
                                      { length: end - start + 1 },
                                      (_, i) => start + i
                                    );
                                    
                                    // Adicionar intervalo à seleção atual, removendo duplicatas
                                    const newSelection = [...new Set([...selectedToDelete, ...range])];
                                    setSelectedToDelete(newSelection);
                                  } else {
                                    toggleDelete(idx);
                                  }
                                }} 
                              />
                            </td>
                            <td className="p-2">
                              {canal.Image ? (
                                <img src={canal.Image} alt={canal.Name} className="w-12 h-8 object-contain" />
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="p-2">{canal.Name}</td>
                            <td className="truncate max-w-xs p-2" title={canal.Path}>{canal.Path}</td>
                            <td className="p-2">{canal.Protocol}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  {selectedToDelete.length} de {canaisServidor.length} canais selecionados
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}