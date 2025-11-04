import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: { error: Error | null; reset: () => void }) => ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Booking section crashed", error, info);
  }

  private reset = () => {
    this.setState({ error: null }, () => {
      this.props.onReset?.();
    });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (error) {
      return fallback({ error, reset: this.reset });
    }

    return children;
  }
}
