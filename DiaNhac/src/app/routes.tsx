import { createHashRouter } from 'react-router';
import { Root } from './pages/Root';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { PaymentResult } from './pages/PaymentResult';
import { Turntables } from './pages/Turntables';
import { Cassettes } from './pages/Cassettes';
import { Accessories } from './pages/Accessories';
import { Blog } from './pages/Blog';
import { BlogDetail } from './pages/BlogDetail';
import { OrderDetail } from './pages/OrderDetail';
import { Guides } from './pages/Guides';
import { GuideDetail } from './pages/GuideDetail';
import { Admin } from './pages/Admin';
import { Account } from './pages/Account';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Chat } from './pages/Chat';

export const router = createHashRouter([
  {
    path: '/',
    Component: Root,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: 'shop',
        Component: Shop,
      },
      {
        path: 'product/:id',
        Component: ProductDetail,
      },
      {
        path: 'cart',
        Component: Cart,
      },
      {
        path: 'checkout',
        Component: Checkout,
      },
      {
        path: 'payment-result',
        Component: PaymentResult,
      },
      {
        path: 'turntables',
        Component: Turntables,
      },
      {
        path: 'cassettes',
        Component: Cassettes,
      },
      {
        path: 'accessories',
        Component: Accessories,
      },
      {
        path: 'blog',
        Component: Blog,
      },
      {
        path: 'blog/:id',
        Component: BlogDetail,
      },
      {
        path: 'guides',
        Component: Guides,
      },
      {
        path: 'guide/:id',
        Component: GuideDetail,
      },
      {
        path: 'admin',
        Component: Admin,
      },
      {
        path: 'account',
        Component: Account,
      },
      {
        path: 'chat',
        Component: Chat,
      },
      {
        path: 'order/:id',
        Component: OrderDetail,
      },
    ],
  },
  {
    path: 'login',
    Component: Login,
  },
  {
    path: 'register',
    Component: Register,
  },
  {
    path: 'forgot-password',
    Component: ForgotPassword,
  },
]);
