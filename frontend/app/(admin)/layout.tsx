import ProtectedRoute from '@/components/common/auth/protected-route';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin']} fallback={<AccessDenied />}>
      {children}
    </ProtectedRoute>
  );
}

function AccessDenied() {
  return (
    <div className="container mx-auto py-20 text-center">
      <h1 className="mb-4 text-3xl font-bold">Acesso negado</h1>
      <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
    </div>
  );
}
