import { RouterProvider, createBrowserRouter } from "react-router-dom";
import {
  AdminCustomers,
  AdminCollections,
  AdminDashboard,
  AdminLayout,
  AdminOrders,
  AdminProducts,
  Cart,
  Checkout,
  Collection,
  HomeLayout,
  Landing,
  Login,
  OrderConfirmation,
  OrderHistory,
  Register,
  Search,
  Shop,
  SingleOrderHistory,
  SingleProduct,
  UserProfile,
} from "./pages";
import { checkoutAction, searchAction } from "./actions/index";
import { shopCategoryLoader } from "./loaders/shopCategoryLoader";
import { orderHistoryLoader } from "./loaders/orderHistoryLoader";
import { singleOrderHistoryLoader } from "./loaders/singleOrderHistoryLoader";

const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "orders", element: <AdminOrders /> },
      { path: "products", element: <AdminProducts /> },
      { path: "collections", element: <AdminCollections /> },
      { path: "customers", element: <AdminCustomers /> },
    ],
  },
  {
    path: "/",
    element: <HomeLayout />,
    children: [
      {
        index: true,
        element: <Landing />,
      },
      {
        path: "shop",
        element: <Shop />,
        loader: shopCategoryLoader,
      },
      {
        path: "shop/:category",
        element: <Shop />,
        loader: shopCategoryLoader,
      },
      {
        path: "collection/:slug",
        element: <Collection />,
      },
      {
        path: "product/:id",
        element: <SingleProduct />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "checkout",
        element: <Checkout />,
        action: checkoutAction,
      },
      {
        path: "search",
        action: searchAction,
        element: <Search />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "order-confirmation",
        element: <OrderConfirmation />,
      },
      {
        path: "user-profile",
        element: <UserProfile />,
      },
      {
        path: "order-history",
        element: <OrderHistory />,
        loader: orderHistoryLoader,
      },
      {
        path: "order-history/:id",
        element: <SingleOrderHistory />,
        loader: singleOrderHistoryLoader,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
