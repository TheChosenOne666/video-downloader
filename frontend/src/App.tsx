import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import ProgressPage from './pages/ProgressPage';
import CompletePage from './pages/CompletePage';
import SummarizePage from './pages/SummarizePage';
import SubtitleGenerationPage from './pages/SubtitleGenerationPage';
import FAQPage from './pages/FAQPage';
import TutorialPage from './pages/TutorialPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import PaymentPage from './pages/PaymentPage';

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/summarize" element={<SummarizePage />} />
        <Route path="/subtitle" element={<SubtitleGenerationPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}

export default App;
