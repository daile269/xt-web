import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Lobby from "./pages/Lobby";
import GameRoom from "./pages/GameRoom";
import Profile from "./pages/Profile";
import Shop from "./pages/Shop";
import Inventory from "./pages/Inventory";
import AdminPanel from "./pages/AdminPanel";

// Components
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";

// Store
import { useAuthStore } from "./store/authStore";

function App() {
  const { user } = useAuthStore();

  return (
    <Router>
      <div className="App">
        {user && <Navbar />}

        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/lobby" />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/lobby" />}
          />

          <Route
            path="/lobby"
            element={
              <PrivateRoute>
                <Lobby />
              </PrivateRoute>
            }
          />

          <Route
            path="/room/:roomId"
            element={
              <PrivateRoute>
                <GameRoom />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          <Route
            path="/shop"
            element={
              <PrivateRoute>
                <Shop />
              </PrivateRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <PrivateRoute>
                <Inventory />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminPanel />
              </PrivateRoute>
            }
          />

          <Route
            path="/"
            element={user ? <Navigate to="/lobby" /> : <Landing />}
          />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Router>
  );
}

export default App;
