import { Component, type ReactNode } from "react";
import { Card } from "./Card";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <Card className="max-w-md text-center">
            <h2 className="mb-2 text-lg font-bold text-red-600">Something went wrong</h2>
            <p className="mb-4 text-sm text-gray-500">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.hash = "#/";
              }}
            >
              Back to Dashboard
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
