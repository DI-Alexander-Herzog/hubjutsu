// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  reloaded: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, reloaded: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, reloaded: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Prüfen, ob es der Inertia-scrollRegions-Fehler ist
    if (
      !this.state.reloaded &&
      error.message?.includes('scrollRegions')
    ) {
      this.setState({ reloaded: true }, () => {
        window.location.reload();
      });
    }
  }

  render() {
    if (this.state.hasError && !this.state.reloaded) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.message}</p>
          <pre>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
