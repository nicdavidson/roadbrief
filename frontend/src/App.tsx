import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RideView from './pages/RideView';
import PhotoGallery from './pages/PhotoGallery';
import RideEditor from './pages/RideEditor';
import ProfilePage from './pages/ProfilePage';
import SidebarMenu from './components/SidebarMenu';
import HeaderBar from './components/HeaderBar';
import './registerServiceWorker';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      {/* Global sidebar menu */}
      <SidebarMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Global header bar (shown on all pages) */}
      <HeaderBar onMenuClick={() => setMenuOpen(true)} />

      <Routes>
        {/* Dashboard - list of rides */}
        <Route path="/rides" element={<Dashboard />} />

        {/* New/Edit ride */}
        <Route path="/rides/new" element={<RideEditor />} />
        <Route path="/rides/:rideId/edit" element={<RideEditor />} />

        {/* View a ride */}
        <Route path="/ride/:shareCode" element={<RideView />} />

        {/* Ride photos */}
        <Route path="/ride/:shareCode/photos" element={<PhotoGallery />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/rides" replace />} />
        <Route path="*" element={<Navigate to="/rides" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
