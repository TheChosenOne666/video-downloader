import { AppProvider, useApp } from './context/AppContext';
import HomePage from './pages/HomePage';
import ProgressPage from './pages/ProgressPage';
import CompletePage from './pages/CompletePage';

function AppContent() {
  const { page } = useApp();

  switch (page) {
    case 'progress':
      return <ProgressPage />;
    case 'complete':
      return <CompletePage />;
    default:
      return <HomePage />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
