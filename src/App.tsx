import { ImageViewer } from "./components/ImageViewer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logError } from "./utils/errorLogger";
import "./App.css";

function App() {
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
    </ErrorBoundary>
  );
}

export default App;
