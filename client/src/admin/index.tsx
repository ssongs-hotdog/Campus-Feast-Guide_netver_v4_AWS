import { Route, Switch, Redirect } from "wouter";
import { AdminLayout } from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import ComingSoon from "./pages/ComingSoon";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { AdminRouteGuard } from "./components/AdminRouteGuard";

/**
 * AdminRoot
 * 
 * Sub-router for /admin namespace.
 * All routes here are relative to the parent router via /admin/:rest*
 */
export default function AdminRoot() {
    return (
        <AdminAuthProvider>
            <Switch>
                {/* Public Admin Route: Login */}
                <Route path="/admin/login" component={AdminLogin} />

                {/* Protected Admin Routes */}
                <Route path="/admin/:nested*">
                    <AdminRouteGuard>
                        <AdminLayout>
                            <Switch>
                                <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
                                <Route path="/admin/dashboard" component={AdminDashboard} />

                                {/* Operations */}
                                <Route path="/admin/monitor" component={ComingSoon} />
                                <Route path="/admin/menu" component={ComingSoon} />
                                <Route path="/admin/ops" component={ComingSoon} />
                                {/* Legacy / hidden routes */}
                                <Route path="/admin/settings" component={ComingSoon} />
                                <Route path="/admin/menus" component={ComingSoon} />

                                {/* Content */}
                                <Route path="/admin/notices" component={ComingSoon} />
                                <Route path="/admin/banners" component={ComingSoon} />

                                {/* Analytics */}
                                <Route path="/admin/reports" component={ComingSoon} />
                                <Route path="/admin/logs" component={ComingSoon} />

                                {/* System */}
                                <Route path="/admin/admins" component={ComingSoon} />

                                {/* Fallback for unknown admin routes */}
                                <Route path="/admin/:rest*">
                                    {(params) => (
                                        <div className="p-8 text-center text-gray-500">
                                            <h2 className="text-xl font-bold mb-2">404 Page Not Found</h2>
                                            <p>관리자 페이지 '{params["rest*"]}'를 찾을 수 없습니다.</p>
                                        </div>
                                    )}
                                </Route>
                            </Switch>
                        </AdminLayout>
                    </AdminRouteGuard>
                </Route>
            </Switch>
        </AdminAuthProvider>
    );
}
