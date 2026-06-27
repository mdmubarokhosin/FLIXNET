"use client";
import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * ErrorBoundary catches React render errors anywhere in the children tree
 * and displays a friendly fallback UI instead of a white screen.
 * Includes a "Try again" button that resets the error state.
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for debugging (could be sent to an error tracking service)
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    // Hard reload clears any corrupted client state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mb-6">
              An unexpected error occurred while rendering this page. You can
              try again, or go back to the home page.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 rounded-md bg-muted border border-border text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-md transition-colors w-full sm:w-auto justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link
                to="/"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground font-semibold px-5 py-2.5 rounded-md transition-colors w-full sm:w-auto justify-center"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 bg-transparent text-muted-foreground hover:text-foreground font-medium px-5 py-2.5 rounded-md transition-colors w-full sm:w-auto justify-center"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
