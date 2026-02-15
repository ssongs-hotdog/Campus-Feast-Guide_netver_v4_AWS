import { Route, Switch, Redirect } from "wouter";
import { AdminLayout } from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";

/**
 * AdminRoot
 * 
 * Sub-router for /admin namespace.
 * All routes here are relative to the parent router, but wouter global routing 
 * usually requires full paths if not properly nested. 
 * Since we are mounting this on /admin/* in App.tsx, we need to handle paths starting with /admin.
 */
export default function AdminRoot() {
    return (
        <AdminLayout>
            <Switch>
                <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
                <Route path="/admin/dashboard" component={AdminDashboard} />

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
    );
}
