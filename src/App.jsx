import React from 'react';
import { Lock } from 'lucide-react';
import { AppProvider, useApp } from './store/AppStore.jsx';
import Shell, { Toasts } from './components/layout/Shell.jsx';
import { EmptyState } from './components/ui.jsx';
import { can } from './lib/permissions.js';
import Dashboard from './modules/dashboard/Dashboard.jsx';
import QuotesList from './modules/quotes/QuotesList.jsx';
import QuoteEditor from './modules/quotes/QuoteEditor.jsx';
import OrdersView from './modules/orders/OrdersView.jsx';
import Clients from './modules/clients/Clients.jsx';
import Sellers from './modules/sellers/Sellers.jsx';
import Inventory from './modules/inventory/Inventory.jsx';
import Purchases from './modules/purchases/Purchases.jsx';
import Users from './modules/users/Users.jsx';

const ROUTES = {
  dashboard: { module: 'dashboard', C: Dashboard },
  quotes: { module: 'quotes', C: QuotesList },
  quote: { module: 'quotes', C: QuoteEditor },
  orders: { module: 'orders', C: OrdersView },
  clients: { module: 'clients', C: Clients },
  sellers: { module: 'sellers', C: Sellers },
  catalog: { module: 'catalog', C: Inventory },
  purchases: { module: 'purchases', C: Purchases },
  users: { module: 'users', C: Users },
};

function Router() {
  const { state, role } = useApp();
  const r = ROUTES[state.route.name] ?? ROUTES.dashboard;
  if (!can(role, r.module)) {
    return (
      <EmptyState icon={Lock} title="Tu rol no tiene acceso a este módulo">
        Cambia de usuario en el menú de sesión o pide acceso al administrador.
      </EmptyState>
    );
  }
  const C = r.C;
  return <C key={state.route.name + (state.route.id ?? '')} route={state.route} />;
}

export default function App() {
  return (
    <AppProvider>
      <Shell>
        <Router />
      </Shell>
      <Toasts />
    </AppProvider>
  );
}
