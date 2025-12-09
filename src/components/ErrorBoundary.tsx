import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 * the entire application.
 * 
 * Features:
 * - Catches and isolates component errors
 * - Logs errors for debugging
 * - Displays friendly error UI
 * - Provides retry mechanism
 * - Prevents error propagation to other components
 * 
 * Requirements: 7.4, 7.5
 * Property 19: Component error isolation
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolationName?: string; // Name of the isolated component for logging
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   * This lifecycle method is called after an error has been thrown by a descendant component
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details
   * This lifecycle method is called after an error has been thrown by a descendant component
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    this.logError(error, errorInfo);

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Log error details for debugging
   * In production, this could send errors to an error tracking service
   */
  private logError(error: Error, errorInfo: ErrorInfo): void {
    const isolationName = this.props.isolationName || 'Unknown Component';
    const timestamp = new Date().toISOString();

    console.error('=== Error Boundary Caught Error ===');
    console.error(`Timestamp: ${timestamp}`);
    console.error(`Component: ${isolationName}`);
    console.error(`Error: ${error.toString()}`);
    console.error(`Error Stack: ${error.stack}`);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('===================================');

    // In production, you could send this to an error tracking service:
    // errorTrackingService.logError({
    //   timestamp,
    //   component: isolationName,
    //   error: error.toString(),
    //   stack: error.stack,
    //   componentStack: errorInfo.componentStack,
    // });
  }

  /**
   * Reset error state to retry rendering
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">组件出错</h2>
            <p className="error-boundary-message">
              {this.props.isolationName || '此组件'}遇到了一个错误，但应用的其他部分仍在正常运行。
            </p>
            
            {this.state.error && (
              <details className="error-boundary-details">
                <summary>错误详情</summary>
                <div className="error-boundary-error-info">
                  <p><strong>错误信息:</strong></p>
                  <pre>{this.state.error.toString()}</pre>
                  
                  {this.state.error.stack && (
                    <>
                      <p><strong>错误堆栈:</strong></p>
                      <pre>{this.state.error.stack}</pre>
                    </>
                  )}
                  
                  {this.state.errorInfo && (
                    <>
                      <p><strong>组件堆栈:</strong></p>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <button 
              className="error-boundary-retry"
              onClick={this.handleReset}
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
