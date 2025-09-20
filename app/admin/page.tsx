"use client"

import React, { useState, useEffect } from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings, Users, LogOut, Edit, Trash2, Download, RefreshCw } from "lucide-react"
import { toast } from "react-hot-toast";

interface SaasUser {
  id: string
  serverName: string
  serverUrl: string
  apiKey: string
  username: string
  name: string
  password: string
  email: string
  type: "admin" | "user"
  createdAt: string
}

function PluginStatusBadge({ serverUrl, apiKey, onStatus, onPluginData }: { serverUrl: string, apiKey: string, onStatus?: (status: 'ok' | 'fail' | 'loading') => void, onPluginData?: (data: any) => void }) {
  const [status, setStatus] = useState<'ok' | 'fail' | 'loading'>('loading');

  useEffect(() => {
    async function checkPlugin() {
      try {
        // Usar a nova API route segura para verificar o plugin
        const res = await fetch('/api/emby/check-plugin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverUrl, apiKey }),
        });
        
        if (!res.ok) {
          setStatus('fail');
          if (onStatus) onStatus('fail');
          return;
        }
        
        const data = await res.json();
        const pluginStatus = data.status === 'ok' ? 'ok' : 'fail';
        setStatus(pluginStatus);
        if (onStatus) onStatus(pluginStatus);
        if (onPluginData) onPluginData(data);
      } catch {
        setStatus('fail');
        if (onStatus) onStatus('fail');
      }
    }
    checkPlugin();
  }, [serverUrl, apiKey, onStatus, onPluginData]);

  if (status === 'loading') return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-gray-300 text-gray-700">plugin</div>;
  if (status === 'ok') return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-green-500 text-white">plugin</div>;
  return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-red-500 text-white">plugin</div>;
}

function UserCard({ user, router, handleEdit, handleDelete }: { user: SaasUser, router: any, handleEdit: (user: SaasUser) => void, handleDelete: (userId: string) => void }) {
  const [pluginStatus, setPluginStatus] = useState<'ok' | 'fail' | 'loading'>('loading');
  const [pluginData, setPluginData] = useState<any>(null);
  const [tvAccessCount, setTvAccessCount] = useState<number | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [iptvCount, setIptvCount] = useState<number | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallPlugins = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsInstalling(true);
    
    try {
      // Verificar quais plugins precisam ser instalados
      const pluginsToInstall = [];
      if (pluginData?.plugins?.iptv !== 'ok') {
        pluginsToInstall.push('IPTV');
      }
      if (pluginData?.plugins?.reports !== 'ok') {
        pluginsToInstall.push('Reports');
      }
      
      if (pluginsToInstall.length === 0) {
        toast.success('Todos os plugins já estão instalados!');
        setIsInstalling(false);
        return;
      }
      
      toast.loading(`Instalando plugins: ${pluginsToInstall.join(', ')}...`);
      
      // Instalar plugins
      const installResponse = await fetch('/api/emby/install-plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: user.serverUrl,
          apiKey: user.apiKey,
          plugins: pluginsToInstall
        })
      });
      
      if (!installResponse.ok) {
        throw new Error('Falha na instalação dos plugins');
      }
      
      toast.success('Plugins instalados! Reiniciando servidor...');
      
      // Reiniciar servidor
      const restartResponse = await fetch('/api/emby/restart-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: user.serverUrl,
          apiKey: user.apiKey
        })
      });
      
      if (!restartResponse.ok) {
        throw new Error('Falha ao reiniciar o servidor');
      }
      
      toast.success('Servidor reiniciado com sucesso! Os plugins foram instalados.');
      
      // Aguardar um pouco e recarregar o status dos plugins
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Erro na instalação:', error);
      toast.error('Erro ao instalar plugins. Tente novamente.');
    } finally {
      setIsInstalling(false);
    }
  };

  useEffect(() => {
    async function fetchEmbyUsers() {
      try {
        const res = await fetch('/api/emby/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverUrl: user.serverUrl, apiKey: user.apiKey }),
        });
        if (res.ok) {
          const embyUsers = await res.json();
          const tvCount = embyUsers.filter((u: any) => u.Policy.EnableLiveTvAccess).length;
          const adminCount = embyUsers.filter((u: any) => u.Policy.IsAdministrator).length;
          setTvAccessCount(tvCount);
          setAdminCount(adminCount);
        } else {
          setTvAccessCount(0);
          setAdminCount(0);
        }
      } catch {
        setTvAccessCount(0);
        setAdminCount(0);
      }
    }

    async function fetchIptvCount() {
      try {
        const response = await fetch('/api/emby/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serverUrl: user.serverUrl,
            apiKey: user.apiKey,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setIptvCount(data.iptvCount || 0);
        }
      } catch (error) {
        console.error('Erro ao buscar contagem de IPTV:', error);
        setIptvCount(0);
      }
    }

    if (pluginStatus === 'ok') {
      fetchEmbyUsers();
      fetchIptvCount();
      
      // Atualizar contagem de IPTV a cada 30 segundos
      const interval = setInterval(fetchIptvCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [pluginStatus, user.serverUrl, user.apiKey]);

  return (
    <Card
      key={user.id}
      className="group border bg-card text-card-foreground shadow-sm hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer relative outline-none focus:ring-2 focus:ring-blue-400"
      role="button"
      tabIndex={0}
      onClick={() => {
        if (pluginStatus === 'ok') {
          router.push(`/dashboard/servidor/${user.id}`);
        } else if (pluginStatus === 'fail') {
          toast.error('Por favor, instale o plugin IPTV no servidor Emby antes de continuar.');
        }
      }}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && pluginStatus === 'ok') {
          router.push(`/dashboard/servidor/${user.id}`);
        } else if ((e.key === 'Enter' || e.key === ' ') && pluginStatus === 'fail') {
          toast.error('Por favor, instale o plugin IPTV no servidor Emby antes de continuar.');
        }
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{user.name}</CardTitle>
          <div className="flex gap-1">
            <Badge variant={user.type === "admin" ? "default" : "secondary"}>
              {user.type === "admin" ? "Admin" : "Usuário"}
            </Badge>
            <PluginStatusBadge serverUrl={user.serverUrl} apiKey={user.apiKey} onStatus={setPluginStatus} onPluginData={setPluginData} />
          </div>
        </div>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Servidor:</span> {user.serverName}
          </div>
          <div>
            <span className="font-medium">URL:</span> {user.serverUrl}
          </div>
          <div>
            <span className="font-medium">Criado em:</span>{" "}
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : ""}
          </div>
          <div>
            <span className="font-medium">Acesso TV:</span>{" "}
            {tvAccessCount === null ? 'Carregando...' : `${tvAccessCount} usuários`}
          </div>
          <div>
            <span className="font-medium">Administradores:</span>{" "}
            {adminCount === null ? 'Carregando...' : `${adminCount} usuários`}
          </div>
          <div>
            <span className="font-medium">Reproduzindo IPTV:</span>{" "}
            {iptvCount === null ? 'Carregando...' : `${iptvCount} usuários`}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleEdit(user); }}>
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleDelete(user.id); }} disabled={user.email === "hygorfragas@gmail.com"}>
            <Trash2 className="w-4 h-4 mr-1" />
            Excluir
          </Button>
          {pluginStatus === 'fail' && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleInstallPlugins}
              disabled={isInstalling}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isInstalling ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              {isInstalling ? 'Instalando...' : 'Instalar Plugins'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<SaasUser[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SaasUser | null>(null)
  const [formData, setFormData] = useState({
    serverName: "",
    serverUrl: "",
    apiKey: "",
    username: "",
    password: "",
    email: "",
    type: "user" as "admin" | "user",
  })
  const router = useRouter()

  // Função para buscar usuários do banco
  async function fetchUsers() {
    const res = await fetch("/api/users")
    if (res.ok) {
      const data = await res.json()
      setUsers(data)
    }
  }

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin")
    if (isAdmin !== "true") {
      router.push("/")
      return
    }
    fetchUsers()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingUser) {
      // Editar usuário existente
      const dataToSend: any = {
        email: formData.email,
        name: formData.username,
        serverName: formData.serverName,
        serverUrl: formData.serverUrl,
        apiKey: formData.apiKey,
        type: formData.type,
      };
      if (formData.password && formData.password !== "") {
        dataToSend.password = formData.password;
      }
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      })
      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({
          serverName: "",
          serverUrl: "",
          apiKey: "",
          username: "",
          password: "",
          email: "",
          type: "user",
        })
        setEditingUser(null)
        fetchUsers()
      } else {
        const error = await res.json()
        alert(error.error || "Erro ao atualizar usuário")
      }
    } else {
      // Criar novo usuário
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.username,
          serverName: formData.serverName,
          serverUrl: formData.serverUrl,
          apiKey: formData.apiKey,
          type: formData.type,
        }),
      })
      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({
          serverName: "",
          serverUrl: "",
          apiKey: "",
          username: "",
          password: "",
          email: "",
          type: "user",
        })
        setEditingUser(null)
        fetchUsers()
      } else {
        const error = await res.json()
        alert(error.error || "Erro ao cadastrar usuário")
      }
    }
  }

  const handleEdit = (user: SaasUser) => {
    setEditingUser(user)
    setFormData({
      serverName: user.serverName,
      serverUrl: user.serverUrl,
      apiKey: user.apiKey,
      username: user.username,
      password: user.password,
      email: user.email,
      type: user.type,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      fetchUsers();
    } else {
      alert("Erro ao excluir usuário");
    }
  }

  const handleLogout = async () => {
    // Limpar localStorage
    localStorage.removeItem("isAdmin")
    localStorage.removeItem("userEmail")
    
    // Chamar API de logout para remover cookies
    await fetch("/api/logout")
    
    // Redirecionar para página inicial
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Painel Administrativo</h1>
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Usuários do SaaS</h2>
              <p className="text-gray-600">Gerencie os usuários e suas configurações de servidor</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingUser(null)
                    setFormData({
                      serverName: "",
                      serverUrl: "",
                      apiKey: "",
                      username: "",
                      password: "",
                      email: "",
                      type: "user",
                    })
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Editar Usuário" : "Criar Novo Usuário"}</DialogTitle>
                  <DialogDescription>
                    Configure as informações do servidor Emby e credenciais do usuário.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="serverName" className="text-right">
                        Nome do Servidor
                      </Label>
                      <Input
                        id="serverName"
                        value={formData.serverName}
                        onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="serverUrl" className="text-right">
                        URL + Porta
                      </Label>
                      <Input
                        id="serverUrl"
                        placeholder="http://localhost:8096"
                        value={formData.serverUrl}
                        onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="apiKey" className="text-right">
                        API Key
                      </Label>
                      <Input
                        id="apiKey"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Nome do Usuário
                      </Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">
                        Senha
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="type" className="text-right">
                        Tipo
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: "admin" | "user") => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingUser ? "Atualizar" : "Criar"} Usuário</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {users.filter(user => user.email !== "hygorfragas@gmail.com").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário cadastrado</h3>
                <p className="text-gray-500 text-center mb-4">Comece criando o primeiro usuário do SaaS</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               {users.filter(user => user.email !== "hygorfragas@gmail.com").map(user => (
                 <UserCard key={user.id} user={user} router={router} handleEdit={handleEdit} handleDelete={handleDelete} />
               ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
