import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import ProgressPage from './pages/ProgressPage';
import CompletePage from './pages/CompletePage';
import SummarizePage from './pages/SummarizePage';
import SubtitleGenerationPage from './pages/SubtitleGenerationPage';

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/summarize" element={<SummarizePage />} />
        <Route path="/subtitle" element={<SubtitleGenerationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}

export default App;
