"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Users, LogOut, Edit, Trash2, Server, Eye, EyeOff, Maximize2, Expand, ExternalLink, Download, RefreshCw, Tv, Play, Pause } from "lucide-react"
import { toast } from "sonner"

interface EmbyUser {
  id: string
  name: string
  serverId: string
  hasPassword: boolean
  isAdministrator: boolean
  isDisabled: boolean
  lastActivityDate: string
  policy: {
    isAdministrator: boolean
    isHidden: boolean
    enableMediaPlayback: boolean
    enableAudioPlaybackTranscoding: boolean
    enableVideoPlaybackTranscoding: boolean
    enablePlaybackRemuxing: boolean
    enableContentDeletion: boolean
    enableContentDownloading: boolean
    enableSubtitleDownloading: boolean
    enableSubtitleManagement: boolean
    enableLiveTvAccess: boolean
    enableLiveTvManagement: boolean
    enableRemoteAccess: boolean
    enableSyncTranscoding: boolean
    enableMediaConversion: boolean
    enableAllChannels: boolean
    enableAllDevices: boolean
    enableAllFolders: boolean
    simultaneousStreamLimit: number
    remoteClientBitrateLimit: number
  }
  configuration: {
    playDefaultAudioTrack: boolean
    subtitleMode: string
    enableNextEpisodeAutoPlay: boolean
    resumeRewindSeconds: number
  }
}

interface NowPlayingItem {
  Name: string
  OriginalTitle?: string
  Id: string
  MediaType: string
  Type?: string
  Path?: string
  PrimaryImageTag?: string
  ImageTags?: {
    Primary?: string
  }
}

interface EmbySession {
  Id: string
  UserId: string
  UserName: string
  Client: string
  DeviceName: string
  DeviceId: string
  ApplicationVersion: string
  LastActivityDate: string
  NowPlayingItem?: NowPlayingItem
  PlayState?: {
    PositionTicks: number
    IsPaused: boolean
  }
  matchedUser?: EmbyUser // Usuário correspondente encontrado na lista de usuários
  }
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

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [embyUsers, setEmbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<EmbyUser | null>(null)
  const [tvAccessCount, setTvAccessCount] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [activeSessions, setActiveSessions] = useState<EmbySession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  // Adicionar campos ao formData
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    isHidden: false,
    isDisabled: false,
    enableLiveTvManagement: false,
    enableLiveTvAccess: false,
    simultaneousStreamLimit: 0,
    playDefaultAudioTrack: true,
    subtitleMode: "Smart",
    enableNextEpisodeAutoPlay: true,
    resumeRewindSeconds: 0,
  })
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [changePassword, setChangePassword] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [embyConnectEmail, setEmbyConnectEmail] = useState("")
  const [previousEmbyConnectEmail, setPreviousEmbyConnectEmail] = useState("")
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null)
  const router = useRouter()
  const [filterText, setFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pluginStatus, setPluginStatus] = useState<'ok' | 'fail' | 'loading'>('loading');
  const [pluginData, setPluginData] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);



  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin")
    const userEmail = localStorage.getItem("userEmail")

    if (isAdmin === "true") {
      router.push("/admin")
      return
    }

    if (!userEmail) {
      router.push("/")
      return
    }

    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }

    // Load mock Emby users
    const mockUsers: EmbyUser[] = [
      {
        id: "1",
        name: "hygorfragas",
        serverId: "5aaf0140cfdc4ca48b6f1192fa1cf3ee",
        hasPassword: true,
        isAdministrator: true,
        isDisabled: false,
        lastActivityDate: "2025-07-19T12:15:17.3919461Z",
        policy: {
          isAdministrator: true,
          isHidden: false,
          enableMediaPlayback: true,
          enableAudioPlaybackTranscoding: true,
          enableVideoPlaybackTranscoding: true,
          enablePlaybackRemuxing: true,
          enableContentDeletion: true,
          enableContentDownloading: true,
          enableSubtitleDownloading: true,
          enableSubtitleManagement: true,
          enableLiveTvAccess: true,
          enableLiveTvManagement: true,
          enableRemoteAccess: true,
          enableSyncTranscoding: true,
          enableMediaConversion: true,
          enableAllChannels: true,
          enableAllDevices: true,
          enableAllFolders: true,
          simultaneousStreamLimit: 0,
          remoteClientBitrateLimit: 0,
        },
        configuration: {
          playDefaultAudioTrack: true,
          subtitleMode: "Smart",
          enableNextEpisodeAutoPlay: true,
          resumeRewindSeconds: 0,
        },
      },
      {
        id: "2",
        name: "denisecastro",
        serverId: "5aaf0140cfdc4ca48b6f1192fa1cf3ee",
        hasPassword: true,
        isAdministrator: false,
        isDisabled: false,
        lastActivityDate: "2025-07-18T10:30:00.0000000Z",
        policy: {
          isAdministrator: false,
          isHidden: false,
          enableMediaPlayback: true,
          enableAudioPlaybackTranscoding: true,
          enableVideoPlaybackTranscoding: true,
          enablePlaybackRemuxing: true,
          enableContentDeletion: false,
          enableContentDownloading: true,
          enableSubtitleDownloading: true,
          enableSubtitleManagement: false,
          enableLiveTvAccess: true,
          enableLiveTvManagement: false,
          enableRemoteAccess: true,
          enableSyncTranscoding: true,
          enableMediaConversion: false,
          enableAllChannels: true,
          enableAllDevices: true,
          enableAllFolders: true,
          simultaneousStreamLimit: 2,
          remoteClientBitrateLimit: 0,
        },
        configuration: {
          playDefaultAudioTrack: true,
          subtitleMode: "Smart",
          enableNextEpisodeAutoPlay: true,
          resumeRewindSeconds: 10,
        },
      },
    ]

    setEmbyUsers(mockUsers);
    // Calcular quantos usuários têm acesso à TV nos dados mockados
    const usersWithTvAccess = mockUsers.filter(user => user.policy?.enableLiveTvAccess === true);
    setTvAccessCount(usersWithTvAccess.length);
  }, [router])

  useEffect(() => {
    // Pegue o usuário logado do localStorage (ou do contexto/autenticação)
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser.type === "admin") {
      setLoading(false);
      return;
    }
    const { serverUrl, apiKey } = currentUser;
    if (!serverUrl || !apiKey) {
      setError("URL ou API Key do Emby não configurados para este usuário.");
      setLoading(false);
      return;
    }
    // Busca usuários do Emby
    fetch(`${serverUrl}/Users?api_key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        setEmbyUsers(data);
        // Calcular quantos usuários têm acesso à TV
        const usersWithTvAccess = data.filter(user => user.policy?.enableLiveTvAccess === true);
        setTvAccessCount(usersWithTvAccess.length);
        setLoading(false);
        
        // Após carregar os usuários, buscar as sessões ativas
        fetchActiveSessions(serverUrl, apiKey);
      })
      .catch(() => {
        setError("Erro ao buscar usuários do Emby.");
        setLoading(false);
      });
  }, []);
  
  // Função para buscar sessões ativas
  const fetchActiveSessions = async (serverUrl: string, apiKey: string) => {
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/emby/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl, apiKey }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao buscar sessões ativas');
      }
      
      const data = await response.json();
      console.log('Dados de sessões recebidos:', data);
      
      if (data.sessions && Array.isArray(data.sessions)) {
        // Filtrar apenas sessões que estão reproduzindo algo
        const playingSessions = data.sessions.filter((session: EmbySession) => 
          session.NowPlayingItem && session.NowPlayingItem.Name
        );
        
        // Verificar se os usuários das sessões existem na lista de usuários
        const sessionsWithUserInfo = playingSessions.map((session: EmbySession) => {
          // Verificar se o usuário existe na lista de usuários
          const matchingUser = embyUsers.find(user => 
            (user.id && session.UserId && user.id.toLowerCase() === session.UserId.toLowerCase()) ||
            (user.Id && session.UserId && user.Id.toLowerCase() === session.UserId.toLowerCase()) ||
            (user.name && session.UserName && user.name.toLowerCase() === session.UserName.toLowerCase()) ||
            (user.Name && session.UserName && user.Name.toLowerCase() === session.UserName.toLowerCase())
          );
          
          if (matchingUser) {
            console.log(`Usuário encontrado para sessão ${session.Id}:`, matchingUser);
            return {
              ...session,
              matchedUser: matchingUser
            };
          }
          
          return session;
        });
        
        console.log('Sessões processadas:', sessionsWithUserInfo);
        setActiveSessions(sessionsWithUserInfo);
      }
    } catch (error) {
      console.error('Erro ao buscar sessões ativas:', error);
      toast.error('Não foi possível carregar as sessões ativas');
    } finally {
      setLoadingSessions(false);
    }
  };
  
  // Atualizar sessões a cada 30 segundos
  useEffect(() => {
    if (!currentUser?.serverUrl || !currentUser?.apiKey) return;
    
    const intervalId = setInterval(() => {
      fetchActiveSessions(currentUser.serverUrl, currentUser.apiKey);
    }, 30000); // 30 segundos
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

  if (loading) return <div>Carregando usuários do Emby...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAdmin) {
      // Simulate API call to Emby server
      const newUser: EmbyUser = {
        id: editingUser?.id || Date.now().toString(),
        name: formData.name,
        serverId: currentUser?.serverId || "5aaf0140cfdc4ca48b6f1192fa1cf3ee",
        hasPassword: !!formData.password,
        isAdministrator: formData.isAdministrator,
        isDisabled: false,
        lastActivityDate: new Date().toISOString(),
        policy: {
          isAdministrator: formData.isAdministrator,
          isHidden: formData.isHidden,
          enableMediaPlayback: formData.enableMediaPlayback,
          enableAudioPlaybackTranscoding: formData.enableAudioPlaybackTranscoding,
          enableVideoPlaybackTranscoding: formData.enableVideoPlaybackTranscoding,
          enablePlaybackRemuxing: formData.enablePlaybackRemuxing,
          enableContentDeletion: formData.enableContentDeletion,
          enableContentDownloading: formData.enableContentDownloading,
          enableSubtitleDownloading: formData.enableSubtitleDownloading,
          enableSubtitleManagement: formData.enableSubtitleManagement,
          enableLiveTvAccess: formData.enableLiveTvAccess,
          enableLiveTvManagement: formData.enableLiveTvManagement,
          enableRemoteAccess: formData.enableRemoteAccess,
          enableSyncTranscoding: formData.enableSyncTranscoding,
          enableMediaConversion: formData.enableMediaConversion,
          enableAllChannels: formData.enableAllChannels,
          enableAllDevices: formData.enableAllDevices,
          enableAllFolders: formData.enableAllFolders,
          simultaneousStreamLimit: formData.simultaneousStreamLimit,
          remoteClientBitrateLimit: formData.remoteClientBitrateLimit,
        },
        configuration: {
          playDefaultAudioTrack: formData.playDefaultAudioTrack,
          subtitleMode: formData.subtitleMode,
          enableNextEpisodeAutoPlay: formData.enableNextEpisodeAutoPlay,
          resumeRewindSeconds: formData.resumeRewindSeconds,
        },
      }

      let updatedUsers
      if (editingUser) {
        updatedUsers = embyUsers.map((user) => (user.id === editingUser.id ? newUser : user))
      } else {
        updatedUsers = [...embyUsers, newUser]
      }

      setEmbyUsers(updatedUsers)
      resetForm()
      setIsDialogOpen(false)
    } else {
      // Usuário comum: verificar se está criando ou editando
      if (editingUser && selectedUserId) {
        // Atualizar usuário existente
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        const { serverUrl, apiKey } = currentUser;
        const adminUsername = "painel";
        const adminPassword = "#140795Hygor#";
        
        try {
          // 1. Autenticar para obter AccessToken
          const authRes = await fetch(`${serverUrl}/emby/Users/AuthenticateByName?api_key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "accept": "application/json" },
            body: JSON.stringify({ Username: adminUsername, Pw: adminPassword }),
          });
          const authData = await authRes.json();
          const accessToken = authData.AccessToken;
          
          if (!accessToken) {
            alert("Falha na autenticação no Emby.");
            return;
          }

          // 2. Atualizar políticas do usuário
          const policy = {
            IsAdministrator: false,
            IsHidden: formData.isHidden,
            IsHiddenRemotely: true,
            IsHiddenFromUnusedDevices: true,
            IsDisabled: formData.isDisabled,
            LockedOutDate: 0,
            AllowTagOrRating: false,
            BlockedTags: [],
            IsTagBlockingModeInclusive: false,
            IncludeTags: [],
            EnableUserPreferenceAccess: true,
            AccessSchedules: [],
            BlockUnratedItems: [],
            EnableRemoteControlOfOtherUsers: false,
            EnableSharedDeviceControl: true,
            EnableRemoteAccess: true,
            EnableLiveTvManagement: formData.enableLiveTvManagement,
            EnableLiveTvAccess: formData.enableLiveTvAccess,
            EnableMediaPlayback: true,
            EnableAudioPlaybackTranscoding: true,
            EnableVideoPlaybackTranscoding: true,
            EnablePlaybackRemuxing: true,
            EnableContentDeletion: false,
            RestrictedFeatures: [],
            EnableContentDeletionFromFolders: [],
            EnableContentDownloading: false,
            EnableSubtitleDownloading: false,
            EnableSubtitleManagement: false,
            EnableSyncTranscoding: true,
            EnableMediaConversion: false,
            EnabledChannels: [],
            EnableAllChannels: true,
            EnabledFolders: [],
            EnableAllFolders: true,
            InvalidLoginAttemptCount: 0,
            EnablePublicSharing: false,
            RemoteClientBitrateLimit: 0,
            AuthenticationProviderId: "Emby.Server.Implementations.Library.DefaultAuthenticationProvider",
            ExcludedSubFolders: [],
            SimultaneousStreamLimit: formData.simultaneousStreamLimit,
            EnabledDevices: [],
            EnableAllDevices: true,
            AllowCameraUpload: false,
            AllowSharingPersonalItems: false
          };

          const policyRes = await fetch(`${serverUrl}/emby/Users/${selectedUserId}/Policy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Emby-Token": accessToken,
            },
            body: JSON.stringify(policy),
          });

          if (!policyRes.ok) {
            alert("Erro ao atualizar políticas do usuário.");
            return;
          }



          // 4. Se o usuário quer alterar a senha, fazer a requisição de alteração
          if (changePassword && newPassword) {
            const passwordRes = await fetch(`${serverUrl}/emby/Users/${selectedUserId}/Password`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Emby-Token": accessToken,
              },
              body: `NewPw=${encodeURIComponent(newPassword)}`,
            });

            if (!passwordRes.ok) {
              alert("Usuário atualizado, mas erro ao alterar senha.");
              return;
            }
          }

          // 5. (Opcional) Vincular ao Emby Connect se email fornecido - VERIFICAR ANTES DE SALVAR
          let embyConnectSuccess = true;
          let embyConnectError = "";

          if (embyConnectEmail) {
            try {
              const connectUrl = `${serverUrl}/emby/Users/${selectedUserId}/Connect/Link?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Opera+Windows&X-Emby-Device-Id=b211e60b-e503-49b2-802b-7882591b69ad&X-Emby-Client-Version=4.8.1.0&X-Emby-Token=${accessToken}&X-Emby-Language=pt-br`;
              
              const connectRes = await fetch(connectUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `ConnectUsername=${encodeURIComponent(embyConnectEmail)}`,
              });

              if (!connectRes.ok) {
                embyConnectSuccess = false;
                
                switch (connectRes.status) {
                  case 400:
                    embyConnectError = "Dados inválidos para vincular ao Emby Connect";
                    break;
                  case 401:
                    embyConnectError = "Não autorizado para vincular ao Emby Connect";
                    break;
                  case 404:
                    embyConnectError = "Usuário não encontrado no Emby Connect";
                    break;
                  case 409:
                    embyConnectError = "Conflito: Email já está vinculado a outro usuário";
                    break;
                  case 500:
                    embyConnectError = "Email não encontrado no Emby Connect ou erro interno do servidor";
                    break;
                  default:
                    embyConnectError = `Erro ${connectRes.status} ao vincular ao Emby Connect`;
                }
              }
            } catch (error) {
              embyConnectSuccess = false;
              embyConnectError = "Erro de conexão ao vincular ao Emby Connect";
            }
          }

          // Se houve erro no Emby Connect, não salvar e mostrar erro
          if (!embyConnectSuccess) {
            setNotification({ type: 'error', message: embyConnectError });
            setTimeout(() => setNotification(null), 5000);
            return; // Para o fluxo aqui, não salva os dados
          }

          // Se chegou até aqui, Emby Connect foi bem-sucedido ou não foi necessário
          if (embyConnectEmail) {
            setNotification({ type: 'success', message: 'Emby Connect vinculado com sucesso!' });
            setTimeout(() => {
              setNotification({ type: 'success', message: 'Usuário atualizado com sucesso!' });
              setTimeout(() => setNotification(null), 3000);
            }, 2000);
          } else {
            // 6. Desvincular Emby Connect se necessário
            if (previousEmbyConnectEmail) {
              try {
                const deleteUrl = `${serverUrl}/emby/Users/${selectedUserId}/Connect/Link/Delete?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Opera+Windows&X-Emby-Device-Id=b211e60b-e503-49b2-802b-7882591b69ad&X-Emby-Client-Version=4.8.1.0&X-Emby-Token=${accessToken}&X-Emby-Language=pt-br`;
                
                const deleteRes = await fetch(deleteUrl, {
                  method: "POST",
                });

                if (deleteRes.ok) {
                  setNotification({ type: 'success', message: 'Emby Connect desvinculado com sucesso!' });
                  setTimeout(() => {
                    setNotification({ type: 'success', message: 'Usuário atualizado com sucesso!' });
                    setTimeout(() => setNotification(null), 3000);
                  }, 2000);
                } else {
                  setNotification({ type: 'warning', message: `Erro ${deleteRes.status} ao desvincular do Emby Connect` });
                  setTimeout(() => setNotification(null), 5000);
                }
              } catch (error) {
                setNotification({ type: 'error', message: 'Erro de conexão ao desvincular do Emby Connect' });
                setTimeout(() => setNotification(null), 5000);
              }
            } else {
              setNotification({ type: 'success', message: 'Usuário atualizado com sucesso!' });
              setTimeout(() => setNotification(null), 3000);
            }
          }
          
          // Fechar modal e resetar formulário
          setIsDialogOpen(false);
          resetForm();
          
          // Recarregar lista de usuários sem recarregar a página
          const userData = JSON.parse(localStorage.getItem("currentUser") || "{}");
          if (userData.type !== "admin") {
            const { serverUrl: reloadServerUrl, apiKey: reloadApiKey } = userData;
            fetch(`${reloadServerUrl}/Users?api_key=${reloadApiKey}`)
              .then(res => res.json())
              .then(data => {
                setEmbyUsers(data);
              })
              .catch(() => {
                setError("Erro ao recarregar usuários do Emby.");
              });
          }
          
        } catch (error) {
          console.error("Erro ao atualizar usuário:", error);
          alert("Erro ao atualizar usuário. Verifique a conexão com o servidor.");
        }
      } else {
        // Criar usuário no Emby (fluxo completo, sempre usando admin fixo)
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        const { serverUrl, apiKey } = currentUser;
        const adminUsername = "painel";
        const adminPassword = "#140795Hygor#";
        // 1. Autenticar para obter AccessToken
        const authRes = await fetch(`${serverUrl}/emby/Users/AuthenticateByName?api_key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "accept": "application/json" },
          body: JSON.stringify({ Username: adminUsername, Pw: adminPassword }),
        });
        const authData = await authRes.json();
        const accessToken = authData.AccessToken;
        if (!accessToken) {
          alert("Falha na autenticação no Emby.");
          return;
        }
        // 2. Criar usuário
        const createRes = await fetch(`${serverUrl}/emby/Users/New`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Emby-Token": accessToken,
          },
          body: JSON.stringify({ Name: formData.name }),
        });
        if (!createRes.ok) {
          alert("Erro ao criar usuário no Emby.");
          return;
        }
        // 3. Obter o ID do usuário criado
        const usersRes = await fetch(`${serverUrl}/emby/Users?api_key=${apiKey}`, {
          headers: { "X-Emby-Token": accessToken }
        });
        const users = await usersRes.json();
        const createdUser = users.find(u => u.Name === formData.name);
        if (!createdUser) {
          alert("Usuário criado, mas não foi possível obter o ID.");
          return;
        }
        const userId = createdUser.Id;
        // 4. Definir senha
        const passRes = await fetch(`${serverUrl}/emby/Users/${userId}/Password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Emby-Token": accessToken,
          },
          body: `NewPw=${encodeURIComponent(formData.password)}`,
        });
        if (!passRes.ok) {
          alert("Usuário criado, mas erro ao definir senha.");
          return;
        }
        // 5. (Opcional) Atualizar políticas
        const policy = {
          IsAdministrator: false,
          IsHidden: formData.isHidden,
          IsHiddenRemotely: true,
          IsHiddenFromUnusedDevices: true,
          IsDisabled: formData.isDisabled,
          LockedOutDate: 0,
          AllowTagOrRating: false,
          BlockedTags: [],
          IsTagBlockingModeInclusive: false,
          IncludeTags: [],
          EnableUserPreferenceAccess: true,
          AccessSchedules: [],
          BlockUnratedItems: [],
          EnableRemoteControlOfOtherUsers: false,
          EnableSharedDeviceControl: true,
          EnableRemoteAccess: true,
          EnableLiveTvManagement: formData.enableLiveTvManagement,
          EnableLiveTvAccess: formData.enableLiveTvAccess,
          EnableMediaPlayback: true,
          EnableAudioPlaybackTranscoding: true,
          EnableVideoPlaybackTranscoding: true,
          EnablePlaybackRemuxing: true,
          EnableContentDeletion: false,
          RestrictedFeatures: [],
          EnableContentDeletionFromFolders: [],
          EnableContentDownloading: false,
          EnableSubtitleDownloading: false,
          EnableSubtitleManagement: false,
          EnableSyncTranscoding: true,
          EnableMediaConversion: false,
          EnabledChannels: [],
          EnableAllChannels: true,
          EnabledFolders: [],
          EnableAllFolders: true,
          InvalidLoginAttemptCount: 0,
          EnablePublicSharing: false,
          RemoteClientBitrateLimit: 0,
          AuthenticationProviderId: "Emby.Server.Implementations.Library.DefaultAuthenticationProvider",
          ExcludedSubFolders: [],
          SimultaneousStreamLimit: formData.simultaneousStreamLimit,
          EnabledDevices: [],
          EnableAllDevices: true,
          AllowCameraUpload: false,
          AllowSharingPersonalItems: false
        };
        const configuration = {
          PlayDefaultAudioTrack: true,
          DisplayMissingEpisodes: false,
          SubtitleMode: "Smart",
          OrderedViews: [],
          LatestItemsExcludes: [],
          MyMediaExcludes: [],
          HidePlayedInLatest: true,
          HidePlayedInMoreLikeThis: false,
          HidePlayedInSuggestions: false,
          RememberAudioSelections: true,
          RememberSubtitleSelections: true,
          EnableNextEpisodeAutoPlay: true,
          ResumeRewindSeconds: 0,
          IntroSkipMode: "ShowButton",
          EnableLocalPassword: false
        };
        await fetch(`${serverUrl}/emby/Users/${userId}/Policy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Emby-Token": accessToken,
          },
          body: JSON.stringify(policy),
        });


        // 6. (Opcional) Vincular ao Emby Connect se email fornecido - VERIFICAR ANTES DE SALVAR
        let embyConnectSuccess = true;
        let embyConnectError = "";

        if (embyConnectEmail) {
          try {
            const connectUrl = `${serverUrl}/emby/Users/${userId}/Connect/Link?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Opera+Windows&X-Emby-Device-Id=b211e60b-e503-49b2-802b-7882591b69ad&X-Emby-Client-Version=4.8.1.0&X-Emby-Token=${accessToken}&X-Emby-Language=pt-br`;
            
            const connectRes = await fetch(connectUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: `ConnectUsername=${encodeURIComponent(embyConnectEmail)}`,
            });

            if (!connectRes.ok) {
              embyConnectSuccess = false;
              
              switch (connectRes.status) {
                case 400:
                  embyConnectError = "Dados inválidos para vincular ao Emby Connect";
                  break;
                case 401:
                  embyConnectError = "Não autorizado para vincular ao Emby Connect";
                  break;
                case 404:
                  embyConnectError = "Usuário não encontrado no Emby Connect";
                  break;
                case 409:
                  embyConnectError = "Conflito: Email já está vinculado a outro usuário";
                  break;
                case 500:
                  embyConnectError = "Email não encontrado no Emby Connect ou erro interno do servidor";
                  break;
                default:
                  embyConnectError = `Erro ${connectRes.status} ao vincular ao Emby Connect`;
              }
            }
          } catch (error) {
            embyConnectSuccess = false;
            embyConnectError = "Erro de conexão ao vincular ao Emby Connect";
          }
        }

        // Se houve erro no Emby Connect, não salvar e mostrar erro
        if (!embyConnectSuccess) {
          setNotification({ type: 'error', message: embyConnectError });
          setTimeout(() => setNotification(null), 5000);
          return; // Para o fluxo aqui, não salva os dados
        }

        // Se chegou até aqui, Emby Connect foi bem-sucedido ou não foi necessário
        if (embyConnectEmail) {
          setNotification({ type: 'success', message: 'Emby Connect vinculado com sucesso!' });
          setTimeout(() => {
            setNotification({ type: 'success', message: 'Usuário criado com sucesso no Emby!' });
            setTimeout(() => setNotification(null), 3000);
          }, 2000);
        } else {
          setNotification({ type: 'success', message: 'Usuário criado com sucesso no Emby!' });
          setTimeout(() => setNotification(null), 3000);
        }
        
        // Fechar modal e resetar formulário
        setIsDialogOpen(false);
        resetForm();
        
        // Recarregar lista de usuários sem recarregar a página
        const userData = JSON.parse(localStorage.getItem("currentUser") || "{}");
        if (userData.type !== "admin") {
          const { serverUrl: reloadServerUrl, apiKey: reloadApiKey } = userData;
          fetch(`${reloadServerUrl}/Users?api_key=${reloadApiKey}`)
            .then(res => res.json())
            .then(data => {
              setEmbyUsers(data);
            })
            .catch(() => {
              setError("Erro ao recarregar usuários do Emby.");
            });
        }
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      password: "",
      isHidden: false,
      isDisabled: false,
      enableLiveTvManagement: false,
      enableLiveTvAccess: false,
      simultaneousStreamLimit: 0,
      playDefaultAudioTrack: true,
      subtitleMode: "Smart",
      enableNextEpisodeAutoPlay: true,
      resumeRewindSeconds: 0,
    })
    setEditingUser(null)
    setSelectedUserId("")
    setChangePassword(false)
    setOldPassword("")
    setNewPassword("")
    setEmbyConnectEmail("")
    setPreviousEmbyConnectEmail("")
  }

  const handleEdit = (user: EmbyUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      password: "",
      isHidden: user.policy.isHidden,
      isDisabled: user.isDisabled,
      enableLiveTvManagement: user.policy.enableLiveTvManagement,
      enableLiveTvAccess: user.policy.enableLiveTvAccess,
      simultaneousStreamLimit: user.policy.simultaneousStreamLimit,
      playDefaultAudioTrack: user.configuration.playDefaultAudioTrack,
      subtitleMode: user.configuration.subtitleMode,
      enableNextEpisodeAutoPlay: user.configuration.enableNextEpisodeAutoPlay,
      resumeRewindSeconds: user.configuration.resumeRewindSeconds,
    })
    setIsDialogOpen(true)
  }

  const handleEditUser = async (user: any) => {
    setEditingUser(user)
    setSelectedUserId(user.Id)
    setFormData({
      name: user.Name,
      password: "",
      isHidden: user.Policy?.IsHidden || false,
      isDisabled: user.Policy?.IsDisabled || false,
      enableLiveTvManagement: user.Policy?.EnableLiveTvManagement || false,
      enableLiveTvAccess: user.Policy?.EnableLiveTvAccess || false,
      simultaneousStreamLimit: user.Policy?.SimultaneousStreamLimit || 0,
      playDefaultAudioTrack: user.Configuration?.PlayDefaultAudioTrack || true,
      subtitleMode: user.Configuration?.SubtitleMode || "Smart",
      enableNextEpisodeAutoPlay: user.Configuration?.EnableNextEpisodeAutoPlay || true,
      resumeRewindSeconds: user.Configuration?.ResumeRewindSeconds || 0,
    })
    setChangePassword(false)
    setOldPassword("")
    setNewPassword("")
    setEmbyConnectEmail("")
    setPreviousEmbyConnectEmail("")



    setIsDialogOpen(true)
  }

  const handleDelete = async (userId: string, userName: string) => {
    // Confirmação antes de deletar
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      const { serverUrl, apiKey } = currentUser;
      const adminUsername = "painel";
      const adminPassword = "#140795Hygor#";

      // 1. Autenticar para obter AccessToken
      const authRes = await fetch(`${serverUrl}/emby/Users/AuthenticateByName?api_key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "accept": "application/json" },
        body: JSON.stringify({ Username: adminUsername, Pw: adminPassword }),
      });

      const authData = await authRes.json();
      const accessToken = authData.AccessToken;

      if (!accessToken) {
        setNotification({ type: 'error', message: 'Falha na autenticação no Emby.' });
        setTimeout(() => setNotification(null), 5000);
        return;
      }

      // 2. Deletar usuário do Emby
      const deleteRes = await fetch(`${serverUrl}/emby/Users/${userId}?X-Emby-Token=${accessToken}`, {
        method: "DELETE",
        headers: {
          "X-Emby-Token": accessToken,
        },
      });

      if (!deleteRes.ok) {
        setNotification({ type: 'error', message: `Erro ao excluir usuário: ${deleteRes.status}` });
        setTimeout(() => setNotification(null), 5000);
        return;
      }

      // 3. Atualizar lista local
      const updatedUsers = embyUsers.filter((user) => user.Id !== userId);
      setEmbyUsers(updatedUsers);

      setNotification({ type: 'success', message: `Usuário "${userName}" excluído com sucesso!` });
      setTimeout(() => setNotification(null), 3000);

    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      setNotification({ type: 'error', message: 'Erro de conexão ao excluir usuário.' });
      setTimeout(() => setNotification(null), 5000);
    }
  }

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
          serverUrl: currentUser.serverUrl,
          apiKey: currentUser.apiKey,
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
          serverUrl: currentUser.serverUrl,
          apiKey: currentUser.apiKey
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

  const handleLogout = async () => {
    // Limpar localStorage
    localStorage.removeItem("isAdmin")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("currentUser")
    
    // Chamar API de logout para remover cookies
    await fetch("/api/logout")
    
    // Redirecionar para página inicial
    router.push("/")
  }

  if (!currentUser) {
    return <div>Carregando...</div>
  }

  // Determina se é admin
  const isAdmin = currentUser && currentUser.type === "admin";

  // Função para filtrar usuários
  const filteredUsers = isAdmin
    ? embyUsers.filter(user => user.name.toLowerCase().includes(filterText.toLowerCase()))
    : embyUsers.filter(user => user.Name.toLowerCase().includes(filterText.toLowerCase()));

  const totalUsers = filteredUsers.length;
  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(totalUsers / itemsPerPage);
  const paginatedUsers = itemsPerPage === 0
    ? filteredUsers
    : filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notificação */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-md ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-yellow-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Server className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{currentUser?.serverName || "Dashboard"}</h1>
                <p className="text-sm text-gray-500">{currentUser?.serverUrl || ""}</p>
              </div>
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
          {/* Cards para exibir estatísticas de usuários */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card para exibir sessões ativas */}
            <div className="bg-white shadow-sm rounded-lg p-4 border overflow-hidden">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                  <Play className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Reproduções Ativas</h3>
                  <p className="text-sm text-gray-500">
                    {loadingSessions ? "Carregando..." : 
                     activeSessions.length > 0 ? `${activeSessions.length} ${activeSessions.length === 1 ? "usuário" : "usuários"} assistindo` : 
                     "Nenhuma reprodução ativa"}
                  </p>
                </div>
              </div>
              
              {/* Lista de reproduções ativas */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {activeSessions.map((session) => (
                  <div 
                    key={session.Id} 
                    className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      // Verificar se já temos o usuário correspondente na sessão
                      if (session.matchedUser) {
                        console.log('Usando usuário já correspondido:', session.matchedUser);
                        // Selecionar o usuário para edição
                        setEditingUser(session.matchedUser);
                        setIsDialogOpen(true);
                      } else {
                        // Tentar encontrar o usuário por ID ou nome (fallback)
                        console.log('Buscando usuário com ID:', session.UserId);
                        
                        const user = embyUsers.find(u => 
                          (u.id && u.id.toLowerCase() === session.UserId.toLowerCase()) || 
                          (u.Id && u.Id.toLowerCase() === session.UserId.toLowerCase()) ||
                          (u.name && u.name.toLowerCase() === session.UserName.toLowerCase()) ||
                          (u.Name && u.Name.toLowerCase() === session.UserName.toLowerCase())
                        );
                        
                        if (user) {
                          console.log('Usuário encontrado:', user);
                          // Selecionar o usuário para edição
                          setEditingUser(user);
                          setIsDialogOpen(true);
                        } else {
                          console.log('Usuário não encontrado');
                          toast.info(`Detalhes do usuário ${session.UserName} não disponíveis. Verifique se o usuário existe no servidor Emby.`);
                        }
                      }
                    }}
                  >
                    <div className="flex-shrink-0 w-12 h-12 mr-3 bg-gray-200 rounded overflow-hidden">
                      {session.NowPlayingItem?.PrimaryImageTag ? (
                        <img 
                          src={`${currentUser.serverUrl}/Items/${session.NowPlayingItem.Id}/Images/Primary?tag=${session.NowPlayingItem.PrimaryImageTag}&api_key=${currentUser.apiKey}`}
                          alt={session.NowPlayingItem.Name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <Tv className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.NowPlayingItem?.Name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session.UserName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {session.DeviceName}
                      </p>
                    </div>
                    <div className="ml-2">
                      {session.PlayState?.IsPaused ? (
                        <Pause className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Play className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
                
                {activeSessions.length === 0 && !loadingSessions && (
                  <div className="text-center py-4 text-gray-500">
                    <p>Nenhuma reprodução ativa no momento</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Card para exibir contagem de usuários com acesso à TV */}
            <div className="bg-white shadow-sm rounded-lg p-4 border">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                  <Tv className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Usuários com Acesso à TV</h3>
                  <p className="text-3xl font-bold text-blue-600">{tvAccessCount}</p>
                  <p className="text-sm text-gray-500">Total de usuários com permissão de acesso à TV</p>
                </div>
              </div>
            </div>
            
            {/* Card para exibir contagem total de usuários */}
            <div className="bg-white shadow-sm rounded-lg p-4 border">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Total de Usuários</h3>
                  <p className="text-3xl font-bold text-green-600">{embyUsers.length}</p>
                  <p className="text-sm text-gray-500">Usuários cadastrados no servidor Emby</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Usuários do Emby</h2>
              <p className="text-gray-600">Gerencie os usuários do seu servidor Emby</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Editar Usuário" : "Criar Novo Usuário"}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? `Editar configurações do usuário ${editingUser.Name || editingUser.name}` : "Configure as informações e políticas do usuário Emby."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-1">
                      <TabsTrigger value="basic">Básico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="name">Nome do Usuário</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        {!editingUser && (
                          <div>
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {editingUser && (
                          <>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="changePassword"
                                checked={changePassword}
                                onCheckedChange={(checked) => setChangePassword(!!checked)}
                              />
                              <Label htmlFor="changePassword">Alterar Senha</Label>
                            </div>
                            
                            {changePassword && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="oldPassword">Senha Atual</Label>
                                  <Input
                                    id="oldPassword"
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Digite a senha atual"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="newPassword">Nova Senha</Label>
                                  <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Digite a nova senha"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        <div>
                          <Label htmlFor="simultaneousStreamLimit">Limite de Streams Simultâneos</Label>
                          <Input
                            id="simultaneousStreamLimit"
                            type="number"
                            min="0"
                            value={formData.simultaneousStreamLimit}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                simultaneousStreamLimit: Number.parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="embyConnectEmail">(Opcional) Endereço de email do Emby Connect</Label>
                          <Input
                            id="embyConnectEmail"
                            type="email"
                            value={embyConnectEmail}
                            onChange={(e) => setEmbyConnectEmail(e.target.value)}
                            placeholder="exemplo@email.com"
                          />
                        </div>
                        {/* Remover o bloco do checkbox de Administrador do formulário */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isHidden"
                            checked={formData.isHidden}
                            onCheckedChange={(checked) => setFormData({ ...formData, isHidden: !!checked })}
                          />
                          <Label htmlFor="isHidden">Usuário Oculto</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isDisabled"
                            checked={formData.isDisabled}
                            onCheckedChange={(checked) => setFormData({ ...formData, isDisabled: !!checked })}
                          />
                          <Label htmlFor="isDisabled">Usuário Desativado</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="enableLiveTvManagement"
                            checked={formData.enableLiveTvManagement}
                            onCheckedChange={(checked) => setFormData({ ...formData, enableLiveTvManagement: !!checked })}
                          />
                          <Label htmlFor="enableLiveTvManagement">Permitir Gerenciar Live TV</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="enableLiveTvAccess"
                            checked={formData.enableLiveTvAccess}
                            onCheckedChange={(checked) => setFormData({ ...formData, enableLiveTvAccess: !!checked })}
                          />
                          <Label htmlFor="enableLiveTvAccess">Permitir Acesso Live TV</Label>
                                                </div>
                      </div>
                    </TabsContent>
 
                    </Tabs>

                  <DialogFooter className="mt-6">
                    <Button type="submit">
                      {editingUser ? "Atualizar Usuário" : "Criar Usuário"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {/* Barra de filtro */}
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 max-w-full">
            <Input
              type="text"
              placeholder="Filtrar por nome do usuário..."
              value={filterText}
              onChange={e => {
                setFilterText(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="itemsPerPage" className="text-sm">Exibir:</label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={e => {
                  const val = Number(e.target.value);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={0}>Tudo</option>
              </select>
            </div>
          </div>
          {/* Grid de usuários */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isAdmin ? (
              paginatedUsers.map((user) => (
                <Card
                  key={user.id}
                  className="group border transition-all cursor-pointer relative outline-none focus:ring-2 focus:ring-blue-400"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/dashboard/servidor/${user.id}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/dashboard/servidor/${user.id}`); }}
                  style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)' }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <div className="flex gap-1">
                        {user.isAdministrator && (
                          <Badge variant="default" className="text-xs">
                            Admin
                          </Badge>
                        )}
                        {user.policy?.isHidden && (
                          <Badge variant="secondary" className="text-xs">
                            Oculto
                          </Badge>
                        )}
                        <PluginStatusBadge 
                          serverUrl={currentUser.serverUrl} 
                          apiKey={currentUser.apiKey} 
                          onStatus={setPluginStatus} 
                          onPluginData={setPluginData} 
                        />
                      </div>
                    </div>
                    <CardDescription>
                      Último acesso: {user.lastActivityDate ? new Date(user.lastActivityDate).toLocaleDateString("pt-BR") : "N/A"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Streams simultâneos:</span>
                        <span>{user.policy?.simultaneousStreamLimit || "Ilimitado"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reprodução:</span>
                        <span>{user.policy?.enableMediaPlayback ? "✓" : "✗"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Download:</span>
                        <span>{user.policy?.enableContentDownloading ? "✓" : "✗"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleEdit(user); }}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleDelete(user.id); }}>
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
              ))
            ) : (
              paginatedUsers.map(user => (
                <div 
                  key={user.Id} 
                  className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEditUser(user)}
                >
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold tracking-tight text-lg">{user.Name}</div>
                      <div className="flex gap-1">
                        {user.Policy?.IsAdministrator && (
                          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 text-xs">
                            Admin
                          </div>
                        )}
                        {user.Policy?.IsDisabled && (
                          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 text-xs">
                            Desabilitado
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Último acesso: {user.LastActivityDate ? (user.LastActivityDate === 'N/A' ? 'Nunca Uso' : new Date(user.LastActivityDate).toLocaleDateString('pt-BR')) : 'Nunca Uso'}
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Streams simultâneos:</span>
                        <span>{user.Policy?.SimultaneousStreamLimit ?? 'Ilimitado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Acesso TV:</span>
                        <span>{user.Policy?.EnableLiveTvAccess ? '✓' : '✗'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emby Connect:</span>
                        <span>{user.ConnectLinkType === 'LinkedUser' ? '✓' : '✗'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(user.Id, user.Name)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Paginação */}
          {itemsPerPage !== 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                className="px-3 py-1 rounded border disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >Anterior</button>
              <span className="text-sm">Página {currentPage} de {totalPages}</span>
              <button
                className="px-3 py-1 rounded border disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >Próxima</button>
            </div>
          )}
        </div>
      </main>
      <style jsx>{`
        .group:hover, .group:focus {
          border-color: #2563eb !important;
          box-shadow: 0 4px 16px 0 rgba(37,99,235,0.15);
        }
      `}</style>
    </div>
  );
}
