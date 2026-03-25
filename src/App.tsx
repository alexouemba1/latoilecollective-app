import { Route, Switch } from "wouter";

import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import Auth from "./pages/Auth";
import ArtistPage from "./pages/ArtistPage";
import Favorites from "./pages/Favorites";
import Quality from "./pages/Quality";
import Conditions from "./pages/Conditions";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";

function App() {
  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>

      <Route path="/gallery">
        <Gallery />
      </Route>

      <Route path="/artist/:id">
        <ArtistPage />
      </Route>

      <Route path="/product/:id">
        <ProductDetail />
      </Route>

      <Route path="/favorites">
        <Favorites />
      </Route>

      <Route path="/cart">
        <Cart />
      </Route>

      <Route path="/checkout">
        <Checkout />
      </Route>

      <Route path="/checkout-success">
        <CheckoutSuccess />
      </Route>

      <Route path="/auth">
        <Auth />
      </Route>

      <Route path="/admin">
        <AdminDashboard />
      </Route>

      <Route path="/seller-dashboard">
        <SellerDashboard />
      </Route>

      <Route path="/quality">
        <Quality />
      </Route>

      <Route path="/conditions">
        <Conditions />
      </Route>

      <Route path="/privacy">
        <Privacy />
      </Route>

      <Route path="/contact">
        <Contact />
      </Route>

      <Route>
        <div>404 - Page non trouvée</div>
      </Route>
    </Switch>
  );
}

export default App;