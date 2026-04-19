import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RideView from './pages/RideView';
import PhotoGallery from './pages/PhotoGallery';
import Profile from './pages/Profile';
import './registerServiceWorker';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main ride view: /ride/{shareCode} */}
        <Route path="/ride/:shareCode" element={<RideView />} />
        
        {/* Photo gallery: /ride/{shareCode}/photos */}
        <Route path="/ride/:shareCode/photos" element={<PhotoGallery />} />
        
        {/* Profile: /profile */}
        <Route path="/profile" element={<Profile />} />
        
        {/* Default: redirect to EMBC ride */}
        <Route path="/" element={<RideView shareCode="embc2026" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
