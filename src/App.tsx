import { ImageViewer } from "./components/ImageViewer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationContainer } from "./components/Notification";
import { useNotification } from "./contexts/NotificationContext";
import { logError } from "./utils/errorLogger";
import "./App.css";

function App() {
  const { notifications, removeNotification } = useNotification();

  const handleError = (error: Error) => {
    logError(
      "Application error caught by root error boundary",
      error,
      "App",
      { location: "root" }
    );
  };

  return (
    <ErrorBoundary
      isolationName="Application Root"
      onError={handleError}
    >
      <ImageViewer />
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </ErrorBoundary>
  );
}

export default App;
