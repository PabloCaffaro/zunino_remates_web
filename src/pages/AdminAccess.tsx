import { useEffect, useState } from "react";
import { createAdminApi, AdminApiError, type AdminUser } from "../data/adminApi";
import { AdminDataProvider } from "../context/AdminDataProvider";
import { AdminLogin, AdminPage } from "./AdminPage";

export function AdminAccess() {
  const [api] = useState(createAdminApi);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.session().then(({ user }) => { if (active) setUser(user); })
      .catch((error: unknown) => { if (active && !(error instanceof AdminApiError && error.status === 401)) setError(error instanceof Error ? error.message : "No se pudo comprobar la sesión."); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [api]);
  const logout = async () => {
    try { await api.logout(); setUser(null); setError(""); }
    catch (error) { setError(error instanceof Error ? error.message : "No se pudo cerrar la sesión."); }
  };
  if (checking) return <main id="contenido-principal" className="section"><div className="container" role="status">Comprobando sesión…</div></main>;
  if (!user) return <><AdminLogin onLogin={async (email, password) => { const { user } = await api.login(email, password); setError(""); setUser(user); }} />{error ? <p className="container" role="alert">{error}</p> : null}</>;
  return <AdminDataProvider api={api} onLogout={logout}>
    {error ? <p className="container" role="alert">{error}</p> : null}
    <AdminPage role={user.rol} onLogout={logout} />
  </AdminDataProvider>;
}
