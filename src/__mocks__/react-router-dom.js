// __mocks__/react-router-dom.js
// Manual mock for react-router-dom to avoid module resolution issues with v7
import React from 'react';

export const BrowserRouter = ({ children }) => (
  <div data-testid="browser-router">{children}</div>
);

export const MemoryRouter = ({ children }) => (
  <div data-testid="memory-router">{children}</div>
);

export const HashRouter = ({ children }) => (
  <div data-testid="hash-router">{children}</div>
);

export const Routes = ({ children }) => (
  <div data-testid="routes">{children}</div>
);

export const Route = ({ element }) => element || null;

export const Link = ({ children, to, ...props }) => (
  <a href={to} {...props}>{children}</a>
);

export const NavLink = ({ children, to, ...props }) => (
  <a href={to} {...props}>{children}</a>
);

export const Navigate = ({ to }) => (
  <div data-testid="navigate" data-to={to} />
);

export const Outlet = () => (
  <div data-testid="outlet" />
);

export const useRoutes = (routes) => (
  <div data-testid="use-routes">Routes Content</div>
);

export const useNavigate = () => {
  const navigate = jest.fn();
  return navigate;
};

export const useLocation = () => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default'
});

export const useParams = () => ({});

export const useSearchParams = () => {
  const searchParams = new URLSearchParams();
  const setSearchParams = jest.fn();
  return [searchParams, setSearchParams];
};

export const useMatch = () => null;

export const useResolvedPath = (to) => ({
  pathname: typeof to === 'string' ? to : to.pathname || '/',
  search: '',
  hash: ''
});

export const useHref = (to) => typeof to === 'string' ? to : to.pathname || '/';

export const useInRouterContext = () => true;

export const useNavigationType = () => 'POP';

export const useOutlet = () => null;

export const useOutletContext = () => ({});

export const createBrowserRouter = (routes) => ({ routes });
export const createMemoryRouter = (routes) => ({ routes });
export const RouterProvider = ({ router, children }) => (
  <div data-testid="router-provider">{children}</div>
);

export default {
  BrowserRouter,
  MemoryRouter,
  HashRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  Outlet,
  useRoutes,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  useMatch,
  useResolvedPath,
  useHref,
  useInRouterContext,
  useNavigationType,
  useOutlet,
  useOutletContext,
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider
};
