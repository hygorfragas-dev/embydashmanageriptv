import { useRouter } from "next/router";
import { LogOut, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ServidorUsuario() {
  const router = useRouter();
  const { userId } = router.query;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
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
          <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2">Gerenciamento do Servidor do Usuário</h2>
            <p className="text-gray-600 mb-4">Aqui você poderá controlar e visualizar informações do servidor deste usuário.</p>
            <div className="text-lg font-mono bg-gray-100 px-4 py-2 rounded mb-2">
              ID do usuário: <span className="font-bold">{userId}</span>
            </div>
            {/* Adicione aqui os controles e informações do servidor */}
          </div>
        </div>
      </main>
    </div>
  );
}